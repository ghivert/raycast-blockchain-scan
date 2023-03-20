import { Action, ActionPanel, Color, Detail, Icon, LaunchProps, List } from '@raycast/api'
import * as etherscan from './etherscan'
import * as ethers from 'ethers'
import { Transaction } from './etherscan/accounts'
import { Fragment, useMemo, useState } from 'react'
import ChainlinkABI from '@chainlink/contracts/abi/v0.8/AggregatorV2V3Interface.json'
import { AsyncState, usePromise } from '@raycast/utils'
import { getPreferences } from './preferences'

const alchemyEndpoint = 'https://eth-mainnet.g.alchemy.com/v2'

function createEthersProvider() {
  const preferences = getPreferences()
  const provider = new ethers.JsonRpcProvider([alchemyEndpoint, preferences.alchemyAPIKey].join('/'))
  return provider
}

async function getEthUsdPrice() {
  const provider = createEthersProvider()
  const oracle = new ethers.Contract('eth-usd.data.eth', ChainlinkABI, provider)
  const result = await oracle.latestRoundData()
  return result.answer * BigInt(10 ** 10)
}

async function getENS(address: string) {
  const provider = createEthersProvider()
  const result = await provider.lookupAddress(address)
  return result
}

function formatWei(symbol: string, wei?: string, round?: boolean) {
  let num = BigInt(wei ?? '0')
  const decimals = BigInt(10 ** 15)
  if (round) num = (num / decimals) * decimals
  const asEth = ethers.formatEther(num)
  return [asEth, symbol].join(' ')
}

function compressTransactionHash(hash: string) {
  const length = hash.length
  const start = hash.slice(0, 5)
  const end = hash.slice(length - 5)
  return [start, end].join('…')
}

type RenderTransactionsProps = { transactions: Transaction[]; toggleDetails: () => void }
const RenderTransactions = (props: RenderTransactionsProps) => (
  <Fragment>
    {props.transactions.map(transaction => {
      const functionName = transaction.functionName
        ? transaction.functionName.slice(0, transaction.functionName.indexOf('('))
        : 'transfer'
      return (
        <List.Item
          key={transaction.hash}
          id={transaction.hash}
          title={`#${transaction.nonce}`}
          subtitle={compressTransactionHash(transaction.hash)}
          detail={
            <List.Item.Detail
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="Transaction Metadata" />
                  <Detail.Metadata.Separator />
                  <Detail.Metadata.Label title="Hash" text={transaction.hash} />
                  <Detail.Metadata.Label title="Nonce" text={transaction.nonce} />
                  <Detail.Metadata.Label title="Block Number" text={transaction.blockNumber} />
                  <Detail.Metadata.Label title="Block Hash" text={transaction.blockHash} />
                  <Detail.Metadata.Label title="Timestamp" text={transaction.timeStamp} />
                  <Detail.Metadata.Label title="Date" text={transaction.date.toLocaleString()} />
                  <Detail.Metadata.Label title="Confirmations" text={transaction.confirmations} />
                  <Detail.Metadata.Label title="" />
                  <Detail.Metadata.Label title="Transaction Data" />
                  <Detail.Metadata.Separator />
                  <Detail.Metadata.Label title="From" text={transaction.from} />
                  <Detail.Metadata.Label title="To" text={transaction.to} />
                  <Detail.Metadata.Label title="Value" text={transaction.value} />
                  <Detail.Metadata.Label title="Gas" text={transaction.gas} />
                  <Detail.Metadata.Label title="Gas Price" text={transaction.gasPrice} />
                  <Detail.Metadata.Label title="Gas Used" text={transaction.gasUsed} />
                  <Detail.Metadata.Label title="Cumulative Gas Used" text={transaction.cumulativeGasUsed} />
                  <Detail.Metadata.Label title="" />
                  <Detail.Metadata.Label title="Transaction Status" />
                  <Detail.Metadata.Separator />
                  <Detail.Metadata.Label title="Transaction Index" text={transaction.transactionIndex} />
                  <Detail.Metadata.Label title="Transaction Receipt Status" text={transaction.txreceipt_status} />
                  <Detail.Metadata.Label title="Is Error" text={transaction.isError} />
                  {transaction.functionName && (
                    <Fragment>
                      <Detail.Metadata.Label title="" />
                      <Detail.Metadata.Label title="Contract Interaction" />
                      <Detail.Metadata.Separator />
                      {transaction.contractAddress && (
                        <Detail.Metadata.Label title="Contract Address" text={transaction.contractAddress} />
                      )}
                      <Detail.Metadata.Label title="Input" text={transaction.input} />
                      <Detail.Metadata.Label title="Method ID" text={transaction.methodId} />
                      <Detail.Metadata.Label title="Function Name" text={transaction.functionName} />
                    </Fragment>
                  )}
                </Detail.Metadata>
              }
            />
          }
          accessories={[
            { tag: { value: functionName } },
            { tag: { value: transaction.date } },
            { tag: { value: transaction.blockNumber } },
            { tag: { value: compressTransactionHash(transaction.to) } },
            transaction.txreceipt_status === '0'
              ? { icon: Icon.XMarkCircle, tag: { value: 'Failure', color: Color.Red } }
              : { icon: Icon.CheckCircle, tag: { value: 'Success', color: Color.Green } },
          ]}
          actions={
            <ActionPanel>
              <Action title="Toggle Details" onAction={props.toggleDetails} />
              <Action.OpenInBrowser title="Open on Etherscan" url={`https://etherscan.io/tx/${transaction.hash}`} />
            </ActionPanel>
          }
        />
      )
    })}
  </Fragment>
)

type AccountSectionProps = {
  rate: AsyncState<bigint>
  balance: AsyncState<string>
  hash: string
  ens: AsyncState<string | null>
  transactions: Transaction[]
  onFocus: (hash: string) => void
}
function AccountSection(props: AccountSectionProps) {
  const balanceBI = BigInt(props.balance.data ?? '0')
  const bnBalance = ((props.rate.data ?? 0n) * balanceBI) / BigInt(10 ** 18)
  const usdBalance = formatWei('$', bnBalance.toString(), true)
  const ethBalance = formatWei('ETH', props.balance.data, true)
  const ens = props.ens.isLoading ? 'Loading…' : props.ens.data ?? 'None'
  const etherscanURL = `https://etherscan.io/address/${props.hash}`
  const lastTransaction = props.transactions[0]?.hash
  return (
    <List.Section title="Account">
      <List.Item
        id="address"
        title="Address"
        accessories={[{ tag: { value: props.hash, color: Color.PrimaryText } }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open on Etherscan" url={etherscanURL} />
            <Action.CopyToClipboard title="Copy Etherscan URL" content={etherscanURL} />
          </ActionPanel>
        }
      />
      <List.Item
        id="ens"
        title="ENS"
        accessories={[{ tag: { value: ens, color: Color.Purple } }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy ENS" content={ens} />
          </ActionPanel>
        }
      />
      <List.Item
        id="balance"
        title="Balance"
        accessories={[
          { tag: { value: ethBalance, color: Color.Blue } },
          { tag: { value: usdBalance, color: Color.Green } },
        ]}
      />
      <List.Item
        id="last-transaction"
        title="Last transaction sent"
        accessories={[{ tag: { value: lastTransaction ?? 'None' } }]}
        actions={
          lastTransaction && (
            <ActionPanel>
              <Action title="Focus on Transaction" onAction={() => props.onFocus(lastTransaction)} />
            </ActionPanel>
          )
        }
      />
    </List.Section>
  )
}

type Arguments = { hash: string }
type Props = LaunchProps<{ arguments: Arguments }>
export default function EtherscanSearch(props: Props) {
  const [isShowingDetails, setIsShowingDetails] = useState(false)
  const [focusedItem, setFocusedItem] = useState<string>()
  const [filterText, setFilterText] = useState('')
  const hash = props.arguments.hash.trim()
  // const hash = '0xcbcb6bd2a1e6085584e323edafb5cf9bb8d77e44'
  if (!ethers.isAddress(hash)) return <Detail markdown="The provided hash is not a valid address." />
  const balance = etherscan.accounts.useBalance(hash)
  const transactions = etherscan.accounts.useTransactions(hash)
  const rate = usePromise(getEthUsdPrice, [])
  const ens = usePromise(getENS, [hash])
  const isLoading = balance.isLoading || transactions.isLoading || rate.isLoading || ens.isLoading
  const txns = useMemo(() => transactions.data ?? [], [transactions.data])
  const filteredTxns = useMemo(() => {
    return txns.filter(txn => {
      if (!filterText) return true
      return (
        txn.blockHash.includes(filterText) ||
        txn.blockNumber.includes(filterText) ||
        txn.contractAddress.includes(filterText) ||
        txn.functionName.includes(filterText) ||
        txn.hash.includes(filterText) ||
        txn.input.includes(filterText) ||
        txn.nonce.includes(filterText) ||
        txn.value.includes(filterText) ||
        txn.to.includes(filterText)
      )
    })
  }, [filterText, txns])
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetails}
      selectedItemId={focusedItem}
      onSearchTextChange={setFilterText}
      onSelectionChange={() => {
        setIsShowingDetails(false)
        setFocusedItem(undefined)
      }}
    >
      {!filterText && (
        <AccountSection
          rate={rate}
          balance={balance}
          hash={hash}
          ens={ens}
          transactions={txns}
          onFocus={setFocusedItem}
        />
      )}
      <List.Section title="Transactions">
        <RenderTransactions transactions={filteredTxns} toggleDetails={() => setIsShowingDetails(v => !v)} />
      </List.Section>
    </List>
  )
}
