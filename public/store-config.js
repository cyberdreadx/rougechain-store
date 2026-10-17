// RougeChain Store settings. This is the only file to edit to open the store (README.md has the steps).
window.STORE = {
  // A Stripe Payment Link for each product (Stripe Dashboard > Payment Links), e.g.
  // "https://buy.stripe.com/...". While a product has none, it isn't on sale.
  checkout: {
    "gltch-runner": ""
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
