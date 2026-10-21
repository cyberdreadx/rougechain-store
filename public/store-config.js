// RougeChain Store settings. This is the only file to edit to open the store (README.md has the steps).
window.STORE = {
  // A Stripe Payment Link for each product (Stripe Dashboard > Payment Links), e.g.
  // "https://buy.stripe.com/...". While a product has none, it isn't on sale.
  checkout: {
    "gltch-runner": ""
  },

  // Public FREE demo only. Set the verified HTTPS download URL and published:true
  // after uploading and checking the complete ZIP. Keep paid Early Access files
  // behind the sales provider's entitlement/download-key system, not in this file.
  downloads: {
    "gltch-runner-demo": {
      published: false,
      url: "",
      version: "0.2.0-demo.4",
      bytes: 3853683482,
      sha256: "bbf2181dcfea78224a4fb5739e8e1db42855937de44ad72e22e6213e87f2c151"
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
