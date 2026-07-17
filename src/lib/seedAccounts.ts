import type { Account } from '../types'
import { parseOtpauthUri } from './parse'
import { normalizeSecret } from './totp'

/**
 * Built-in otpauth URIs. Parsed at module load so accounts appear immediately
 * even when localStorage is empty.
 */
const SEED_URIS = [
  'otpauth://totp/1password:?secret=WWDOTEJ6HJ5MUXYO&issuer=1password',
  'otpauth://totp/Mixpanel:vaibhav%40optiblack.com?secret=GNCH25RX73G4RB24KYHUVB3AWYCNQ2DG&issuer=Mixpanel',
  'otpauth://totp/Microsoft:vaibhav.soni%40external.tataconsumer.com?secret=mjt5jjb2rbh67fyr&issuer=Microsoft',
  'otpauth://totp/Braze:vaibhav%40optiblack.com?secret=HJGDHNA4WTUWZH7LB3UWKCMANH2KVKAG&issuer=Braze',
  'otpauth://totp/HubSpot:vaibhav%40optiblack.com?secret=QMGFVXYDSQIC45JN7FK2K4YLK37JQBU4&issuer=HubSpot',
  'otpauth://totp/Google:dev%40optiblack.com?secret=lu43hdrk3sq3berzm7dhg6uoadgj7y3q&issuer=Google',
  'otpauth://totp/Customer.io:vaibhav_hummingbirds%40optiblack.com?secret=mhj2i65fzt7tuqtx&issuer=Customer.io',
  'otpauth://totp/Customer.io:vaibhav_alltroo%40optiblack.com?secret=zgdkkskolmiks54o&issuer=Customer.io',
  'otpauth://totp/Klaviyo:vaibhav%40optiblack.com?secret=GJCESXDI7X2VCPAY&issuer=Klaviyo',
  'otpauth://totp/OpenAI:dev%40optiblack.com?secret=QZWUMVLODUUUG5I7KBCOKDS23UYREHWT&issuer=OpenAI',
  'otpauth://totp/GitHub:OptiblackHQ?secret=4ZSA65D2DYXWPQYZ&issuer=GitHub',
  'otpauth://totp/Klaviyo:dev%40optiblack.com?secret=BEFBBHWJ77NQEF3W&issuer=Klaviyo',
  'otpauth://totp/Microsoft:pooja.bansal%40drreddys.com?secret=tql2vczvpcdq5rtw&issuer=Microsoft',
  'otpauth://totp/Shopify:vaibhav%40optiblack.com?secret=J64IM6FTDIAK4ZOJ5BFYXDB6EXIQCBQD&issuer=Shopify',
  'otpauth://totp/Microsoft:vaibhav.soni%40drreddys.com?secret=c6frfqyh55ngdzq7&issuer=Microsoft',
  'otpauth://totp/Customer.io:vaibhav_redx%40optiblack.com?secret=tdflfnbsosvzq3bu&issuer=Customer.io',
  'otpauth://totp/GitHub:optiblackcode?secret=LT6YKQMK66SGWZRH&issuer=GitHub',
  'otpauth://totp/Stripe:%20vaibhav%40optiblack.com?secret=2sorkuyu7ai5ltiggwzfnabd&issuer=Stripe',
  'otpauth://totp/OpenAI:dev%40optiblack.com?secret=QZWUMVLODUUUG5I7KBCOKDS23UYREHWT&issuer=OpenAI',
  'otpauth://totp/Google:analytics%40optiblack.com?secret=tuzstcxyurrohs4wcbsr453fjbjpmvp2&issuer=Google',
  'otpauth://totp/Microsoft:Amit_Shete%40agrim.app?secret=y5ltqrfzzdhxh22r&issuer=Microsoft',
  'otpauth://totp/moengage.com:vaibhav%40optiblack.com?secret=F6XPJHABNSPNL7Q6RPJEW7L52ETVOFHZ&issuer=moengage.com',
  'otpauth://totp/moengage.com:vaibhav%40optiblack.com?secret=WCGR422WNMKBMP3Q5RDY445VO2WXA6YI&issuer=moengage.com',
  'otpauth://totp/Klaviyo:vishal%40optiblack.com?secret=PCGA7ZZ6K2C2ET5E&issuer=Klaviyo',
  'otpauth://totp/Klaviyo:vishal%40optiblack.com?secret=XVHSSRHGMB6ASXGI&issuer=Klaviyo',
] as const

const SEED_CREATED_AT = 0

function buildSeedAccounts(): Account[] {
  const seen = new Set<string>()
  const accounts: Account[] = []

  for (const uri of SEED_URIS) {
    const draft = parseOtpauthUri(uri)
    if (!draft) continue

    const key = normalizeSecret(draft.secret)
    if (seen.has(key)) continue
    seen.add(key)

    accounts.push({
      ...draft,
      id: `seed-${key}`,
      source: 'seed',
      createdAt: SEED_CREATED_AT,
      updatedAt: SEED_CREATED_AT,
    })
  }

  return accounts
}

/** Hardcoded seed accounts (OpenAI duplicate URI deduped by secret). */
export const SEED_ACCOUNTS: Account[] = buildSeedAccounts()

/**
 * Ensure every seed account is present. Existing entries with the same secret
 * are kept (user edits / ids preserved). Non-seed extras stay after the seed set.
 */
export function mergeWithSeedAccounts(existing: Account[]): Account[] {
  const bySecret = new Map(
    existing.map((a) => [normalizeSecret(a.secret), a] as const),
  )
  const result: Account[] = []
  const used = new Set<string>()

  for (const seed of SEED_ACCOUNTS) {
    const key = normalizeSecret(seed.secret)
    result.push(bySecret.get(key) ?? seed)
    used.add(key)
  }

  for (const account of existing) {
    const key = normalizeSecret(account.secret)
    if (used.has(key)) continue
    result.push(account)
    used.add(key)
  }

  return result
}
