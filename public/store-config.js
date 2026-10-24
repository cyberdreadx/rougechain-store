// RougeChain Store settings. This is the only file to edit to open the store (README.md has the steps).
window.STORE = {
  // Early Access checkout opens the verified public $20 itch.io project.
  // For future releases, keep published:false until the public listing and upload are verified.
  // A legacy "https://buy.stripe.com/..." link also works.
  // The itch.io URL must be a separate paid project, never the free-demo project,
  // a private download key, an archive or an expiring CDN URL. See README.md.
  checkout: {
    "gltch-runner": {
      provider: "itch.io",
      url: "https://cyberdreadx.itch.io/gltch-runner-early-access",
      published: true
    }
  },

  // Public FREE demo only. Enable published:true after the uploaded build and
  // signed-out itch.io download are verified. Keep the stable project page URL,
  // not an expiring CDN download URL. Keep paid Early Access files
  // behind the sales provider's entitlement/download-key system, not in this file.
  downloads: {
    "gltch-runner-demo": {
      published: true,
      provider: "itch.io",
      url: "https://cyberdreadx.itch.io/gltch-runner-demo",
      version: "0.2.0-demo.12",
      // Exact folder submitted to Butler; itch.io generates its own ZIP.
      sourceBuild: {
        id: "arsenal-20261023-2",
        manifestSha256: "5c0051571ac4fbb1066c03652fc59ce967de6f9a4c1f21ea727287b05a8a7352"
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
