import { getPreferenceValues } from '@raycast/api'

export type Preferences = {
  etherscanAPIKey: string
  alchemyAPIKey: string
}

export const getPreferences = () => {
  return getPreferenceValues<Preferences>()
}
