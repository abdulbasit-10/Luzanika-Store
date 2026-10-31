/**
 * Passwords that appear at the top of every leaked-password list. With a short
 * minimum length these are the ones attackers try first, so they are refused.
 * All lowercase; matching ignores case.
 */
const COMMON = `
123456 1234567 12345678 123456789 1234567890 12345678910 123123 1231234 123321 12341234
654321 666666 7777777 888888 987654321 111111 222222 333333 444444 555555 000000 121212
112233 159753 147258369 1q2w3e 1q2w3e4r 1q2w3e4r5t 1qaz2wsx q1w2e3r4 qwerty qwerty1 qwerty12
qwerty123 qwertyuiop qwerty1234 qazwsx asdfgh asdfghjk asdfghjkl zxcvbn zxcvbnm zaq12wsx
abcdef abc123 abcd1234 abcdefg abcdefgh password password1 password12 password123 password1234
passw0rd p@ssw0rd p@ssword pass123 passpass letmein letmein1 welcome welcome1 welcome123 admin
admin123 administrator root toor changeme default guest login master hello hello123 helloworld
iloveyou iloveyou1 ilovecats loveyou lovely love123 princess princess1 sunshine shadow monkey
dragon football baseball soccer cricket hockey batman superman spiderman starwars pokemon
michael jordan jennifer jessica ashley daniel thomas charlie andrew robert matthew
trustno1 whatever freedom mustang access secret secret1 qazwsxedc zxcasdqwe azerty azerty123
pakistan pakistan1 pakistan123 karachi lahore islamabad germany deutschland berlin
luzanika luzanika1 luzanika123 luzanika786 ali123 ahmed123 muhammad muhammad1 muhammad123
bismillah allah123 786786 7867860 mohammad
`
  .split(/\s+/)
  .filter(Boolean);

const COMMON_PASSWORDS: ReadonlySet<string> = new Set(COMMON);

/** True for passwords made of one repeated character, e.g. "aaaaaa". */
function isRepeated(password: string): boolean {
  return new Set(password).size === 1;
}

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  return COMMON_PASSWORDS.has(lower) || isRepeated(lower);
}

export { COMMON_PASSWORDS };
