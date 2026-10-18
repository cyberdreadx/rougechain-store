# RougeChain Store

The store site for store.rougechain.io: the homepage and the Gltch Runner page. The pages are plain
static files with no build step. Accounts (sign in with email or a RougeChain wallet) run as one small
Netlify Function beside them.

```
public/
  index.html          the homepage: featured game, departments, offers, shelves
  gltch-runner.html   Gltch Runner's page: screenshots, Early Access, buy box, about, arsenal, arenas
  thanks.html         where Stripe sends a buyer after paying
  store-config.js     THE FILE YOU EDIT: Stripe links, email signup, contact, policy links
  store.js            prices, cart, checkout, wishlist (prices live in PRODUCTS at the top)
  account.js          the Sign in button and account panel (email, password, RougeChain wallet)
  app.js, app.css     the store as an app: tab bar, sheets, swipes, install hint (phones)
  sw.js               the service worker: installable, opens offline
  manifest.webmanifest  the app's name, icons, colours and shortcuts
  offline.html        shown for a page the app hasn't saved yet, without a connection
  icons/              app icons (the RougeChain ring mark) and the install screenshots
  fonts/              the game's typefaces, served from the site itself (SIL Open Font License)
  img/                screenshots, weapon renders, the RougeChain logo
netlify/
  functions/api.mjs   the accounts API, served at /api/*
  lib/accounts.mjs    its routes: email codes, passwords, Sign-In with RougeChain, linking, lists
  lib/…               sessions and hashing, the Resend email, the Netlify Blobs store
test/                 the API's tests (npm test)
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

## 3. Take payments with Stripe

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
3. **Add the product:** Products > Add product, "Gltch Runner (Early Access)", one-time price **$20.00 USD**. The crossed-out $30.00 only exists on the site, in `store.js`.
4. **Make a Payment Link** for it. Under After payment, choose not to show Stripe's confirmation page and redirect to `https://store.rougechain.io/thanks.html`.
5. **Test it first.** In Stripe's test mode, make the same link (its URL has `test_` in it) and put it in `checkout["gltch-runner"]`. Deploy, then buy with the card `4242 4242 4242 4242`, any future date and any CVC. You should land on the thanks page, and the payment should show in Stripe.
6. **Go live:** swap the test link for the live one and deploy again.

**Delivering the game:** Stripe takes the money; it doesn't send the game. Every sale shows up in Stripe > Payments with the buyer's email. For the alpha, send each buyer a download key by hand (itch.io: your game > Distribute > Download keys). Once sales are steady, a Stripe webhook can send keys automatically. That needs a small server function.

**Merch:** Managed Payments covers digital products only. Physical merch needs shipping and tax handled separately, either with standard Stripe and Stripe Tax or through a print-on-demand shop.

## Changing a price or ending the sale

- **On the site:** edit `PRODUCTS` at the top of `public/store.js`. `was` and `now` are in cents (3000 = $30.00). Every price box, the discount badge and the cart follow it. With `was` equal to `now`, the badge and the crossed-out price disappear.
- **On Stripe:** add a new price to the product and make a new Payment Link for it. Stripe charges whatever its link says.

Nothing in `store-config.js` is secret: Payment Links are meant to be public. Never put a Stripe secret key in this site.

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
