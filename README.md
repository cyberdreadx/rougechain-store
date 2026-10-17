# RougeChain Store

The store site for store.rougechain.io: the homepage and the Gltch Runner page. It's a plain static site
with no server and no build step. Put the `public` folder online as it is.

```
public/
  index.html          the homepage: featured game, departments, offers, shelves
  gltch-runner.html   Gltch Runner's page: screenshots, Early Access, buy box, about, arsenal, arenas
  thanks.html         where Stripe sends a buyer after paying
  store-config.js     THE FILE YOU EDIT: Stripe links, email signup, contact, policy links
  store.js            prices, cart, checkout, wishlist (prices live in PRODUCTS at the top)
  fonts/              the game's typefaces, served from the site itself (SIL Open Font License)
  img/                screenshots, weapon renders, the RougeChain logo
preview.py            makes a claude.ai preview page from public/index.html
netlify.toml          tells Netlify to publish public/ (no build step)
```

The site has three states, and `store-config.js` picks which one shows:

| store-config.js | What visitors see |
|---|---|
| nothing filled in | a preview: Add to cart, but checkout says it isn't open yet |
| `signupAction` set | **Get notified** buttons that open an email signup |
| a Stripe link in `checkout` | **Add to cart**, and Continue to payment goes to Stripe |

## 1. Put it online at store.rougechain.io

**Cloudflare Pages:**
1. Dashboard > Workers & Pages > Create > Pages > Upload assets. Name the project (e.g. `rougechain-store`) and upload the `public` folder.
2. In the project, open Custom domains and add `store.rougechain.io`.
   - If rougechain.io's DNS is on Cloudflare, the record is added for you.
   - If not, add a CNAME record at your DNS host: `store` pointing to `rougechain-store.pages.dev`.
3. To update the site later, upload `public` again as a new deployment.

Netlify works the same way: drop the `public` folder at app.netlify.com/drop, then add the domain and point a CNAME at the `.netlify.app` address it gives you.

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
