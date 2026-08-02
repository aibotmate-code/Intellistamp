-- 1. Ensure pgcrypto is installed
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN

  -- 2. Migrate valid bcrypt hashes mistakenly stored in staff_pin
  UPDATE public.businesses
  SET 
    staff_pin_hash = staff_pin
  WHERE 
    staff_pin IS NOT NULL 
    AND staff_pin ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
    AND staff_pin_hash IS NULL;

  -- 3. Backfill staff_pin_hash for valid 4-digit plaintext PINs
  -- Order: validate -> hash. We only hash valid legacy 4-digit PINs.
  UPDATE public.businesses
  SET 
    staff_pin_hash = extensions.crypt(staff_pin, extensions.gen_salt('bf', 10))
  WHERE 
    staff_pin IS NOT NULL 
    AND staff_pin ~ '^[0-9]{4}$'
    AND staff_pin_hash IS NULL;

  -- 4. Drop NOT NULL constraint on staff_pin before nulling it safely
  ALTER TABLE public.businesses ALTER COLUMN staff_pin DROP NOT NULL;

  -- 5. Eliminate all plaintext safely after confirming valid hash exists
  UPDATE public.businesses
  SET staff_pin = NULL
  WHERE staff_pin IS NOT NULL
    AND staff_pin_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$';

  -- 6. Convert blank or whitespace-only values to NULL
  UPDATE public.businesses
  SET staff_pin = NULL
  WHERE staff_pin IS NOT NULL
    AND btrim(staff_pin) = '';

  -- Note: Rows with malformed plaintext or malformed hashes that were not successfully
  -- converted will retain their bad values to be caught by pre/post flight checks.

END $$;
