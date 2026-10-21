// RougeChain Store settings. This is the only file to edit to open the store (README.md has the steps).
window.STORE = {
  // A Stripe Payment Link for each product (Stripe Dashboard > Payment Links), e.g.
  // "https://buy.stripe.com/...". While a product has none, it isn't on sale.
  checkout: {
    "gltch-runner": ""
  },

  // Public FREE demo only. Enable published:true after the uploaded build and
  // signed-out itch.io download are verified. Keep the stable project page URL,
  // not an expiring CDN download URL. Keep paid Early Access files
  // behind the sales provider's entitlement/download-key system, not in this file.
  downloads: {
    "gltch-runner-demo": {
      published: true,
      provider: "itch.io",
      url: "https://cyberdreadx.itch.io/gltch-runner-demo-v01",
      version: "0.2.0-demo.5",
      // Provenance of the ZIP supplied to Butler. itch.io repackages its contents;
      // these are not the size/checksum of itch.io's generated downloads.
      sourceArchive: {
        filename: "GltchRunnerDemo-0.2.0-demo.5-Windows.zip",
        bytes: 3853682434,
        sha256: "39f086cffab5f21ab6777c9bcb3e9d9bdbda1c3d77c4de3bfd0e301294c1903d"
      }
    }
  },

  // While nothing is on sale: the email signup. Paste the form "action" URL from your newsletter
  // service's embed code, and the name of its email field ("email" for Buttondown, "EMAIL" for
  // Mailchimp). Add any hidden fields its embed form has, e.g. { "tag": "gltch-runner" }.
  signupAction: "",
  signupField: "email",
  signupHidden: {},

  // Shown in the footer and on the thanks page.
  contactEmail: "",

  // Your policies, wherever they live. Stripe asks for terms, a refund policy and a privacy policy
  // on the site before it lets you take payments.
  termsUrl: "",
  refundUrl: "",
  privacyUrl: ""
};
