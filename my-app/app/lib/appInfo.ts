/** Version shown on Settings → Support & About, read straight from package.json so it can never drift out of sync with a manually-typed constant. */
import pkg from "../../package.json";

export const APP_VERSION: string = pkg.version;
