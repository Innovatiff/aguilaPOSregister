# Deploying the register

The register is a static site: any static host works. Netlify steps:

1. In Netlify choose **Add new site → Import an existing project** and pick the
   `aguilaPOSregister` repository (branch of your choice). `netlify.toml` already sets the
   build command (`npm run build`), the publish folder (`dist`), Node 22 and the single-page
   app redirect.
2. Under **Site settings → Environment variables** add:
   * `VITE_API_BASE_URL` — the public URL of the back office, e.g. `https://aguilapos.netlify.app`
     when the back office is on Netlify, or `https://aguila-pos-api.onrender.com` on Render
     (see the deploy guide in the `aguilaPOS` repo).
     Leave it out to run the register stand-alone with the bundled catalog and demo PINs.
   * optionally `VITE_REGISTER_ID` (`REG-01`), `VITE_REGISTER_NAME`, `VITE_REGISTER_KEY`
     (must match the API's `REGISTER_KEY`).
3. Deploy. Open the site on the till in full screen; open `/customer` on the second monitor.

Notes

* Associates can change the API URL, register ID and device key at any time in
  **Settings → Back office connection**; those values are stored on the device and override
  the build-time defaults.
* The site is served over HTTPS, so the API must be HTTPS too (Render, Railway and Fly
  provide this automatically). A `http://localhost` API cannot be reached from the hosted
  register.
* For a second till, deploy the same site again (or use a branch deploy) with
  `VITE_REGISTER_ID=REG-02`, or just change the register ID in Settings on that device.
