-- The shop's real contact details replace the placeholders that shipped with the settings table.
-- A value is only replaced while it is still the untouched placeholder, so anything staff already
-- changed in the admin Settings is kept.
UPDATE shop_settings
SET contact_email = 'infoluzanika@gmail.com'
WHERE contact_email = 'Luzanika@example.com';

UPDATE shop_settings
SET customer_service_phone = '+92 326 8468166'
WHERE customer_service_phone = '(480) 555-0103';

UPDATE shop_settings
SET socials = '[
  {"name": "Facebook", "href": "https://www.facebook.com/profile.php?id=61594033053002"},
  {"name": "Instagram", "href": "https://www.instagram.com/luzanikaofficial/"},
  {"name": "TikTok", "href": "https://www.tiktok.com/@luzanika8"}
]'::jsonb
WHERE socials = '[
  {"name": "LinkedIn", "href": "https://www.linkedin.com"},
  {"name": "X", "href": "https://x.com"},
  {"name": "Facebook", "href": "https://www.facebook.com"}
]'::jsonb;
