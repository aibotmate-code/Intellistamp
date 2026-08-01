-- Note: This is an unapplied template script. In a real environment, you must use pgcrypto.
-- The extension is enabled as follows:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Find all businesses with a plaintext PIN and generate a bcrypt hash
UPDATE businesses
SET 
  staff_pin_hash = crypt(staff_pin, gen_salt('bf', 10)),
  staff_pin = 'MIGRATED_' || id  -- Clear the plaintext safely by replacing it with a placeholder
WHERE 
  staff_pin IS NOT NULL 
  AND staff_pin_hash IS NULL;
