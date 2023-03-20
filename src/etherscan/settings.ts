import { useFetch } from '@raycast/utils'
import { getPreferences } from '../preferences'

export type Arguments = { [key: string]: string }
export type EtherscanResponse<Response> = {
  status: string
  message: string
  result: Response
}

const endpoints = {
  mainnet: 'https://api.etherscan.io/api',
  goerli: 'https://api-goerli.etherscan.io/api',
  sepolia: 'https://api-sepolia.etherscan.io/api',
}

function argsToSearchParams(args: Arguments) {
  const entries = Object.entries(args)
  const joined = entries.flatMap(([k, v]) => (!v ? [] : [[k, v].join('=')]))
  return joined.join('&')
}

async function parseResponse<Value>(response: Response) {
  if (!response.ok) throw 'Network error'
  const json: EtherscanResponse<Value> = await response.json()
  if (json.message === 'OK') return json.result
  throw json.result
}

export function useEtherscan<Response>(args: Arguments) {
  const preferences = getPreferences()
  const apikey = preferences.etherscanAPIKey
  const searchParams = argsToSearchParams({ ...args, apikey })
  const endpoint = [endpoints.mainnet, searchParams].join('?')
  return useFetch<Response>(endpoint, { parseResponse })
}
