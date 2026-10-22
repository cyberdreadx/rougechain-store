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
      url: "https://cyberdreadx.itch.io/gltch-runner-demo-v01",
      version: "0.2.0-demo.10",
      // Verified local release archive. itch.io repackages the uploaded files;
      // these are not the size/checksum of itch.io's generated downloads.
      sourceArchive: {
        filename: "GltchRunnerDemo-0.2.0-demo.10-Windows.zip",
        bytes: 3790084688,
        sha256: "3a91ab9336ce8dea76667407786f7ae0b68eeb031bc69a6114361cce948a82ff"
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
