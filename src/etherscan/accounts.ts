import { useEtherscan } from './settings'

export const useBalance = (address: string) => {
  return useEtherscan<string>({
    module: 'account',
    action: 'balance',
    address,
    tag: 'latest',
  })
}

export type Transaction = {
  blockNumber: string
  timeStamp: string
  date: Date
  hash: string
  nonce: string
  blockHash: string
  transactionIndex: string
  from: string
  to: string
  value: string
  gas: string
  gasPrice: string
  isError: string
  txreceipt_status: string
  input: string
  contractAddress: string
  cumulativeGasUsed: string
  gasUsed: string
  confirmations: string
  methodId: string
  functionName: string
}
export type UseTransactions = Transaction[]
export const useTransactions = (address: string) => {
  const state = useEtherscan<UseTransactions>({
    module: 'account',
    action: 'txlist',
    address,
    startblock: '0',
    endblock: '99999999',
    page: '0',
    offset: '100000',
    sort: 'desc',
  })
  if (state.data) {
    state.data = state.data.map(tx => {
      const date = new Date(parseInt(tx.timeStamp) * 1000)
      return { ...tx, date }
    })
  }
  return state
}
