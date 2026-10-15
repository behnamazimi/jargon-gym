# Mobile app (Capacitor)

The Android and iOS apps are a Capacitor 8 shell around the live site. The web
app is server-rendered (Server Actions, a cookie session in `proxy.ts`), so it
can't be bundled: `capacitor.config.ts` sets `server.url` to
`https://lobyas.com` and the shell just loads it. A web deploy reaches the apps
at once; a store release is only needed for native changes.

## Layout

- `capacitor.config.ts`: app id `com.lobyas.app`, the server URL, and
  `allowNavigation` (only lobyas.com; other links leave the app).
- `native/www/`: the only bundled pages. `offline.html` is shown by
  `server.errorPath` when the site can't be reached; its button always goes to
  lobyas.com, even in a preview build.
- `ios/` (Swift Package Manager) and `android/`: committed native projects.
  `ios/` and `android/` are skipped by oxlint, oxfmt, knip and Vercel.
- `resources/icon-only.png`, `resources/splash.png`: the source art. Run
  `pnpm mobile:assets` after changing them. Both were rendered from
  `BrandMarkImage` / `BrandSplash` in `lib/brand-icon.tsx`.
- `fastlane/` and `Gemfile`: the signed upload lanes CI uses.

## Working on it

```bash
pnpm mobile:sync       # copy config and plugins into ios/ and android/; run it after pnpm install
pnpm mobile:android    # open Android Studio
pnpm mobile:ios        # open Xcode
```

To try a branch, point the shell at any URL (a Vercel preview, or your machine
on the same network) before syncing:

```bash
CAP_SERVER_URL=https://<preview>.vercel.app pnpm mobile:sync
```

Web code detects the app with `isNativeShell()` (`lib/native/shell.ts`, the
`LobyasApp` user agent). Load Capacitor plugins with a dynamic `import()` inside
a check for it, and assume an installed app may be older than the web code: a
plugin added later won't exist in it.

## Google sign-in

Google refuses sign-in inside a WebView, so `GoogleSignInButton` calls
`POST /auth/native/google` from the WebView (the `x-lobyas-native` header keeps a
cross-site form from calling it), which stores the sign-in cookie there. It
opens the returned URL in the system browser, and Supabase sends the
user back to `com.lobyas.app://auth/callback?code=…`. `NativeAuthBridge`
catches that link (`parseAuthDeepLink`, which accepts only that exact link and
sanitises `next`) and loads `/auth/callback` in the WebView, which exchanges the
code. The scheme is registered in `AndroidManifest.xml` and `Info.plist`, and
must be in Supabase's redirect allow list (`supabase/config.toml` locally, the
dashboard for hosted projects). A link that reopens a fully closed app is not
handled; the user just taps the button again.

Sign in with Apple isn't built. App Review requires it once Google is offered.

## CI

`.github/workflows/mobile.yml`:

| Trigger                            | What runs                                                 |
| ---------------------------------- | --------------------------------------------------------- |
| Pull request touching native files | Unsigned Android debug build, iOS simulator build         |
| Tag `mobile-v*`                    | Signed builds, uploaded to Play internal and TestFlight   |
| Manual run                         | Same as above when "upload" is ticked, unsigned otherwise |

Signed jobs run in the `Mobile release` environment. The version comes from
`package.json`; the build number is the workflow run number. Secrets:

| Secret                                                                                              | For                                                                                           |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Upload key                                                                                    |
| `PLAY_SERVICE_ACCOUNT_JSON`                                                                         | Play Console API access                                                                       |
| `APPLE_TEAM_ID`                                                                                     | Signing team                                                                                  |
| `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY`                  | App Store Connect API key (the `.p8` text)                                                    |
| `MATCH_GIT_URL`, `MATCH_GIT_BASIC_AUTHORIZATION`, `MATCH_PASSWORD`                                  | fastlane `match` certificate repo (`MATCH_GIT_BASIC_AUTHORIZATION` is base64 of `user:token`) |

One-time setup outside the repo: create both apps (`com.lobyas.app`), run
`fastlane match appstore` once locally to create the certificate and profile,
add `com.lobyas.app://auth/**` to the hosted Supabase project's redirect URLs,
and upload a first bundle to Play by hand (the API can't create the first
release of a new app).
