# Excalibur Tiled Vite Sample

Play sample [here](https://excaliburjs.com/sample-tiled-vite)

![sample-animation](./sample.gif)

## Running locally

* Using [nodejs](https://nodejs.org/en/) and [npm](https://www.npmjs.com/)
* Run the `npm install` to install dependencies
* Run the `npm run start` to run the development server to test out changes

## Building bundles

* Run `npm run start` to produce javascript bundles for debugging in the `dist/` folder
* Run `npm run build` to produce javascript bundles for production (minified) in the `dist/` folder

## Supabase Setup (Custom Characters)

1. Create a Supabase project.
2. Open the SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy [`.env.example`](./.env.example) to `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart `npm run start`.

When Supabase is configured, the top-right `Characters` menu supports:
- Adding a named character to a chosen department
- Deleting saved custom characters
