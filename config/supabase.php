<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Supabase Project URL
    |--------------------------------------------------------------------------
    |
    | The URL of your Supabase project. You can find this in your Supabase
    | project settings under "API".
    |
    */
    'url' => env('SUPABASE_URL'),

    /*
    |--------------------------------------------------------------------------
    | Supabase Anon Key
    |--------------------------------------------------------------------------
    |
    | The anonymous/public key for your Supabase project. This key is safe
    | to use in client-side code and has limited permissions.
    |
    */
    'key' => env('SUPABASE_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Supabase Service Role Key
    |--------------------------------------------------------------------------
    |
    | The service role key for your Supabase project. This key has full
    | access to your project and should only be used server-side.
    | NEVER expose this key to the client.
    |
    */
    'service_role_key' => env('SUPABASE_SERVICE_ROLE_KEY'),
];
