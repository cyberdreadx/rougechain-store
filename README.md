# RougeChain Store

The store site for store.rougechain.io: the homepage and the Gltch Runner page. The pages are plain
static files with no build step. Accounts (sign in with email or a RougeChain wallet) run as one small
Netlify Function beside them.

```
public/
  index.html          the homepage: featured game, departments, offers, shelves
  gltch-runner.html   Gltch Runner's page: screenshots, Early Access, buy box, about, arsenal, arenas
  thanks.html         where Stripe sends a buyer after paying
  store-config.js     THE FILE YOU EDIT: checkout provider, free demo delivery, signup, contact, policies
  downloads.js        enables the free demo button only for a published HTTPS download
  store.js            prices, cart, checkout, wishlist (prices live in PRODUCTS at the top)
  account.js          the Sign in button and account panel (email, password, RougeChain wallet)
  i18n.js             picks the language and swaps in its words (see Languages)
  i18n/               the words: es, ru, ja, zh, ko, one file each
  app.js, app.css     the store as an app: tab bar, sheets, swipes, install hint (phones)
  store-motion.css, store-motion.js  neon framing, signal sweeps and motion accessibility
  sw.js               the service worker: installable, opens offline
  manifest.webmanifest  the app's name, icons, colours and shortcuts
  offline.html        shown for a page the app hasn't saved yet, without a connection
  icons/              app icons (Kestrel Block at night, from img/kestrel-night.jpg), the R favicon, install screenshots
  fonts/              the game's typefaces, plus Cyrillic companions for Russian (SIL Open Font License)
  img/                screenshots, weapon renders, the RougeChain logo
netlify/
  functions/api.mjs   the accounts API, served at /api/*
  lib/accounts.mjs    its routes: email codes, passwords, Sign-In with RougeChain, linking, lists
  lib/…               sessions and hashing, the Resend email, the Netlify Blobs store
test/                 API, translations, download delivery and motion tests (npm test)
preview.py            makes a claude.ai preview page from public/index.html
netlify.toml          tells Netlify to publish public/ and where the function is
package.json          the function's two dependencies: @rougechain/sdk and @netlify/blobs
```

The site has three states, and `store-config.js` picks which one shows:

| store-config.js | What visitors see |
|---|---|
| nothing filled in | a preview: Add to cart, but checkout says it isn't open yet |
| `signupAction` set | **Get notified** buttons that open an email signup |
| a Stripe link in `checkout` | **Add to cart**, and Continue to payment goes to Stripe |
| a published itch.io checkout object | **Add to cart**, and Continue on itch.io opens the paid project |

## 1. Put it online at store.rougechain.io

store.rougechain.io is on Netlify. Deploy it from this GitHub repository, so the accounts function goes
out with the pages. Dragging the `public` folder onto Netlify only publishes the pages; sign-in then
stays hidden.

1. In Netlify, open the store's site > Site configuration > Build & deploy > Link repository, and pick
   `cyberdreadx/rougechain-store`. Leave the build command empty: `netlify.toml` already says to
   publish `public` and where the function is.
2. Every push to `main` deploys. Pull requests get a deploy preview, where sign-in works too.

To start a new site instead: Add new site > Import an existing project > GitHub, then add the domain
`store.rougechain.io` and point a CNAME for `store` at the `.netlify.app` address it gives you.

## 2. Collect emails until it's on sale

1. Make a list at a newsletter service (Buttondown, Mailchimp, Kit...).
2. From the service's "embed form" code, copy the form's `action` URL into `signupAction`.
3. Set `signupField` to its email field's name: `email` for Buttondown, `EMAIL` for Mailchimp.
4. Put any hidden fields its embed form has into `signupHidden`.

The signup form says the address is only used for RougeChain releases. Set `privacyUrl` so it links to your privacy policy.

## 3. Sell Early Access through a separate paid itch.io project

The free demo stays on its existing project. Create a **separate paid project** for Early Access,
configure its payment account and $20.00 USD minimum price, and upload the Early Access build only
to that paid project. Confirm its title, edition, price, uploaded version and purchase/download flow
before activating checkout. A public project page is fine; a direct paid archive or private key is not.

Early Access checkout is enabled for the public project below. A signed-out check verified its
$20.00 USD minimum price, version `0.2.0-ea.2` Windows download listing and **Pay with Card** option;
the owner also confirmed the uploaded build is ready. No purchase was completed, so the payment
receipt and post-purchase download flow have not been tested.

```js
"gltch-runner": {
  provider: "itch.io",
  published: true,
  url: "https://cyberdreadx.itch.io/gltch-runner-early-access"
}
```

Set `published: true` only after that exact project is verified and ready to sell. A draft page may
return 404 to a signed-out visitor; that does not verify its price or delivery. Checkout accepts a
creator's `*.itch.io` project page, rejects the configured
free-demo project, and rejects credentials, custom ports, query strings, fragments and download/archive
paths. This prevents misrouting; it does not independently verify a project's price or ownership.

The cart says **Continue on itch.io** and explains that payment and downloads are managed there.
RougeChain sign-in is separate: no store account ID or email is attached to that link, and purchasing
does not create a RougeChain account library entry. itch.io handles the buyer's purchase/download
access. A completed purchase, receipt and post-purchase access test remains a separate verification
step; the public listing and payment dialog checks do not establish that result.

## 3B. Stripe checkout (optional alternative)

1. **Create the Stripe account** for RougeChain Technologies and finish verification (business details, bank account). Stripe looks at the site during review. It expects to see:
   - what you sell and at what price (the site shows this)
   - a contact email
   - terms
   - a refund policy
   - a privacy policy

   Set `contactEmail`, `termsUrl`, `refundUrl` and `privacyUrl` before you apply. They appear in the footers.
2. **Decide who handles sales tax.**
   - **Managed Payments:** Stripe acts as the merchant of record for digital products. It works out, collects and pays sales tax and VAT, and handles fraud and disputes, for an extra fee per sale. Check Stripe's pricing page and whether your account is eligible.
   - **Standard Stripe with Stripe Tax:** cheaper per sale, but RougeChain is the seller of record. Stripe Tax calculates and collects the tax; you register and file. Selling digital goods to EU or UK buyers from outside them means VAT is owed from the first sale. US states have their own thresholds.
3. **Add the product:** Products > Add product, "Gltch Runner (Early Access)", one-time price **$20.00 USD**. The site shows this price without a discount or crossed-out comparison price.
4. **Make a Payment Link** for it. Under After payment, choose not to show Stripe's confirmation page and redirect to `https://store.rougechain.io/thanks.html`.
5. **Test it first.** In Stripe's test mode, make the same link (its URL has `test_` in it) and put it in `checkout["gltch-runner"]`. Deploy, then buy with the card `4242 4242 4242 4242`, any future date and any CVC. You should land on the thanks page, and the payment should show in Stripe.
6. **Go live:** swap the test link for the live one and deploy again.

**Delivering Early Access:** Stripe takes the money; it doesn't send the game. Paid delivery remains external to this repository. After confirming the payment, issue the buyer a private download key through the chosen delivery provider (for example, itch.io: your game > Distribute > Download keys). An automated service must verify the Stripe webhook and purchase entitlement before issuing a key or temporary download URL. A visit to `thanks.html` or a store sign-in is not proof of purchase. Do not publish the paid EXE/ZIP or private keys in `public/`, `store-config.js`, or a public release.

**Merch:** Managed Payments covers digital products only. Physical merch needs shipping and tax handled separately, either with standard Stripe and Stripe Tax or through a print-on-demand shop.

## Changing a price

- **On the site:** edit `PRODUCTS` at the top of `public/store.js`. `was` and `now` are in cents. Early Access currently sets both to `2000` ($20.00), so every price box and the cart agree and no discount badge or crossed-out price appears. Only add a comparison price when it represents an actual offer.
- **On Stripe:** add a new price to the product and make a new Payment Link for it. Stripe charges whatever its link says.

Nothing in `store-config.js` is secret: Payment Links and public paid-project pages are meant to be public. Never put a Stripe secret key or private download key in this site.

## Publish the free demo download

The free demo has its own delivery setting, independent of paid checkout:
`STORE.downloads["gltch-runner-demo"]` in `public/store-config.js`. Its current metadata is:

```js
{
  published: true,
  provider: "itch.io",
  url: "https://cyberdreadx.itch.io/gltch-runner-demo",
  version: "0.2.0-demo.11",
  sourceArchive: {
    filename: "GltchRunnerDemo-0.2.0-demo.11-Windows.zip",
    bytes: 3790112961,
    sha256: "d8e7f09df54c756bd9e665e58e5c82da75afa3313729160d742ed0adf6d7f940"
  }
}
```

Upload the verified build folder with Butler to `cyberdreadx/gltch-runner-demo:windows-demo` with
`--userversion 0.2.0-demo.11`. After the upload, verify the channel's version and downloaded build
contents, and confirm that a signed-out visitor can reach the public project page and download
the demo for free. Only then set `published` to `true` and deploy the site. Until it is enabled,
the download button stays disabled and its status says the download is being prepared.

Keep the stable itch.io project URL instead of a temporary signed CDN download URL. The button
says **Download free demo on itch.io** and shows the version/provider. Its HTTPS URL must have an
`itch.io` or `*.itch.io` hostname; credentials in a URL are rejected. The canonical project slug is independent of the build version; the older
`gltch-runner-demo-v01` URL redirects to it.

`sourceArchive` describes the corresponding local 3.79 GB ZIP. Butler uploads the verified build
folder, and itch.io generates its own download archives and patches. The original ZIP's size and SHA-256
are source provenance, not a claim about itch.io's generated download. The page does not display
that source size, and the browser does not fetch or hash the ZIP. For a new version, update the
version and source metadata together and verify the hosted build before enabling it. Archives
belong on the download host, not in Netlify's `public/` directory or this Git repository.

Only the **free demo** belongs in `downloads`. The public paid project page may be set separately
in `checkout`; the paid Early Access files stay behind the delivery provider's purchase entitlement
or download-key system described above.

## Storefront motion

The homepage and game page include `store-motion.css` and `store-motion.js`. They add cyan/magenta
corner frames, slow signal sweeps, screen-edge accents, one-time panel entrances and button/card
feedback. Content is immediately usable: there is no loading gate, fake progress bar, canvas,
video background, animation timer or scroll handler.

`prefers-reduced-motion` keeps the decoration static, including when the preference changes while
the page is open. Offscreen panels pause their looping accents. Hidden tabs and page suspension
pause animation and disconnect the observers; returning resumes visible panels without replaying
their entrances. Without JavaScript, content and controls remain visible and usable. The motion
layer does not capture pointer input or change mobile sheets and the sticky purchase controls.

The focused lifecycle checks run with `node --test test/store-motion.test.mjs`; `npm test` includes
them with the rest of the store checks. Keep both motion files and `downloads.js` in the service
worker's `SHELL` list when updating the offline app.

## Accounts and sign-in

**Sign in** sits in the store bar. It opens one screen: **Continue with RougeChain wallet**, or an
email and **Continue**. Both reach the same account once linked, and there's no separate sign-up.

- **Email.** Continue emails a 6-digit code, which signs in by itself once it's typed (or pasted).
  New addresses get an account. People who set a password can use it instead ("Use password
  instead"); the browser remembers that and goes straight to the password next time. Forgotten
  passwords are reset with a code.
- **RougeChain wallet.** The wallet signs a one-time *Sign-In with RougeChain* message with its
  ML-DSA-65 key. Nothing goes on chain and no funds can move. The function checks it with
  `verifySignIn` from `@rougechain/sdk`, following
  [Wallet authentication](https://docs.rougechain.io/advanced/wallet-authentication): the nonce is
  issued by the server and works once, the domain comes from configuration, the chain id is checked,
  and the message expires after 10 minutes.

While someone is signed in:

- their wishlist and follows are saved to the account and follow them to other devices;
- checkout adds `client_reference_id=<account id>` and `prefilled_email` to the Stripe Payment Link.
  In Stripe, each payment's Checkout Session shows the account id as its **client reference ID**,
  which is what a "My library" page can use later.
- itch.io checkout receives neither value; purchases and downloads remain managed by itch.io.

Signed in, the same button opens a short list (Email, Wallet, Password). Each row opens its own
screen: add an email to a wallet account or a wallet to an email account (one tap, the wallet asks),
set or change a password, or remove either sign-in while the other one stays. Sign out is at the
bottom.

### Turn it on

1. **Resend** (sends the code emails): make an account at resend.com, add the domain `rougechain.io`
   under Domains and add the DNS records it shows, then create an API key with "Sending access".
2. In Netlify > Site configuration > Environment variables, add:

   | Variable | Value |
   |---|---|
   | `RESEND_API_KEY` | the Resend API key (`re_…`). Mark it as secret. |
   | `AUTH_EMAIL_FROM` | who the emails come from, e.g. `RougeChain Store <login@rougechain.io>` (that is the default). The domain must be verified in Resend. |

3. Deploy again. Until `RESEND_API_KEY` is set, sign-in shows the wallet button only.

Optional settings:

| Variable | Default | What it does |
|---|---|---|
| `STORE_ORIGINS` | `https://store.rougechain.io` | The addresses the store is served from, comma-separated. Only these may use the API, and wallet messages name them. Deploy previews and `netlify dev` can always use their own address. |
| `ROUGECHAIN_CHAIN_ID` | `rougechain-mainnet-1` | The network named in wallet sign-in messages (`rougechain-devnet-1` for testnet). |
| `AUTH_SECRET` | made and kept in the store | A long random string used to hash email codes. Set it if you'd rather keep it outside the data. |

**Which wallets sign in.** Any wallet with `window.rougechain.signMessage`:

- **Qwalla** (iPhone, Android, desktop and Qwalla Browser): its built-in browser has it. On a phone
  without a wallet, the button reads **Continue with Qwalla** and opens the same page in Qwalla
  (`qwalla:///(tabs)/browser?url=…#sign-in`, which lands on sign-in). If Qwalla doesn't open, it
  says so in one line with a link to qwalla.io.
- **RougeChain Wallet extension** 1.8 or later. The Chrome Web Store had 1.6.0 on 2026-10-17;
  publishing the current extension (`apps/extension` in rougechain-node, 1.9.0) turns it on for
  Chrome, Edge and Brave users.

A wallet without `signMessage` is asked to update. The store never falls back to `signTransaction`.

### Where the data lives

Everything is in one Netlify Blobs store called `rc-auth` (Netlify > the site > Blobs). Deploy
previews and `netlify dev` use a separate store, `rc-auth-preview`, so testing never touches real
accounts. Passwords are
hashed with scrypt, emailed codes are kept only as an HMAC, and sessions are kept as a hash of the
token in the browser's cookie (`__Host-rc_session`, HttpOnly, 30 days). The layout of the keys is at
the top of `netlify/lib/store.mjs`. No card details are ever here: Stripe handles payment.

Built-in limits: a code works once for 10 minutes and allows 5 guesses; one code a minute and 6 an hour
per address; 10 password tries per address per 15 minutes; per-visitor caps on everything else.

### Working on it locally

```
npm install
npx netlify-cli dev        # the site and the API at http://localhost:8888
npm test                   # the API's tests: email, passwords, wallet signatures, linking, guards
```

Under `netlify dev` without `RESEND_API_KEY`, sign-in codes are printed in the terminal instead of
emailed.

## The store as an app

The store installs to a phone's home screen or a computer's dock and opens like an app: full screen,
its own icon, no browser bars.

- **Android, Chrome, Edge:** the browser offers to install it. On a phone, the store also shows a
  small "Get the app" card once, from the second visit, with an **Install** button.
- **iPhone, iPad:** Safari's Share > Add to Home Screen. The same card says so, once.
- **Shortcuts** (long-press the icon on Android): Gltch Runner, Your cart, Your wishlist.

On a phone (760px and narrower) the store works like an app:

- a **tab bar** at the bottom: Store, Wishlist (with a count), Cart (with a count), Account. It
  replaces the store bar's buttons on phones; on a computer nothing changes.
- the cart, wishlist, sign-in and signup open as **bottom sheets**: swipe one down to close it, or
  tap outside. The page behind doesn't scroll.
- **swipe** the screenshots on the game page and the featured game on the homepage.
- on the game page, once its title scrolls away, the bar shows **GLTCH RUNNER · Add · $20.00**,
  until the real buy box is on screen.
- buttons press in when tapped, Android gives a light buzz when something is added, inputs are
  16px so iOS doesn't zoom, and pages fade into each other where the browser supports it.

**Offline.** `sw.js` saves the pages, scripts, styles, logo and thumbnails when the app is first
opened, and images as they're viewed. Pages and scripts always come from the network first, so a
deploy is live on the next load. Without a connection the saved copy opens, and a page that was
never opened shows `offline.html`. Sign-in (`/api/*`) and Stripe are never cached.

When you add a page or a file the app should keep offline, add it to `SHELL` in `public/sw.js`
and raise `VERSION`. `netlify.toml` serves `sw.js` uncached so updates reach installed copies.

## Languages

The store speaks **English, Spanish, Russian, Japanese, Chinese (Simplified) and Korean**. It picks
the visitor's phone or browser language on its own; the footer has
**English · Español · Русский · 日本語 · 中文 · 한국어** links, and `?lang=en|es|ru|ja|zh|ko` on any
address switches too. The choice is remembered.

- The pages are written in English. `public/i18n.js` swaps each text, button, label and alt text
  for its translation before the page shows, so nobody sees it change. The cart, wishlist, sign-in,
  the app's tab bar and install card, the accounts server's messages and the sign-in code email
  are translated too. Dates follow the language.
- The words live in `public/i18n/<lang>.js`, one file per language. A visitor downloads only
  their own language's file.
- Names stay as they are: Gltch Runner, Kestrel Block, NEXUS, Dead Signal, the weapons and arenas,
  XRGE. Prices stay in US dollars.
- **Russian letters:** the game's typefaces have no Cyrillic, so `fonts/fonts.css` adds Exo 2 beside
  Rajdhani, Russo One beside Orbitron and PT Mono beside Share Tech Mono, for Cyrillic letters
  only (31 KB in all, downloaded only by pages with Russian on them).
- **Japanese, Chinese and Korean** use the phone's or computer's own fonts (they hold thousands of
  characters, too many to download). `<html lang>` is set to `ja`, `zh-CN` or `ko`, so the device
  draws each language's own form of the characters. `app.css` gives these languages taller lines,
  and stops Korean words from breaking in the middle. Chinese is Simplified; readers of
  Traditional Chinese get Simplified for now.

**Changing or adding text.** Add the English and its translation to every file in `public/i18n`:

```js
// public/i18n/es.js
"Add to cart": "Añadir al carrito",
// public/i18n/ja.js
"Add to cart": "カートに追加",
```

`npm test` reads every page, script and server message and fails with a list of any English that
has no translation, and checks that every language file has the same lines, so new text can't slip
through untranslated. Text with a value in it uses a `{slot}`, the same in every language:
`"{name} isn't on sale yet…"`. Spanish uses "tú", Russian "вы", Japanese polite です/ます,
Korean polite 해요, and Chinese 你.
