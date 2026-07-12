-- ScrapMap ATL — demo seed data (optional, recommended for pitching).
-- Run AFTER schema.sql. Gives the map the same starting state as the local demo.

insert into public.interest_pins (lat, lng, neighborhood_id) values
  (33.7702, -84.3735, 'o4w'),
  (33.7688, -84.3689, 'o4w'),
  (33.7659, -84.3762, 'o4w'),
  (33.7641, -84.3701, 'o4w'),
  (33.7625, -84.3745, 'o4w'),
  (33.7679, -84.3651, 'o4w'),
  (33.7712, -84.3672, 'o4w'),
  (33.7549, -84.3187, 'kirkwood'),
  (33.7538, -84.3121, 'kirkwood'),
  (33.7512, -84.3174, 'kirkwood'),
  (33.7501, -84.3139, 'kirkwood'),
  (33.7561, -84.3149, 'kirkwood'),
  (33.7524, -84.3208, 'kirkwood'),
  (33.7489, -84.3186, 'kirkwood'),
  (33.7381, -84.4427, 'westview');

insert into public.groups
  (neighborhood_id, host_label, lat, lng, capacity, monthly_cost, pickup_day, bin_size, status, activation_target, seed_members, invite_code)
values
  ('o4w', 'Corner of North Ave & Glen Iris', 33.7712, -84.3706, 5, 32, 'Thursday', '12-gallon bin', 'active', 4, 3, 'o4w-gleniris'),
  ('o4w', 'Highland Ave near the Beltline steps', 33.7647, -84.3663, 6, 38, 'Monday', '20-gallon bin', 'active', 4, 4, 'o4w-highland');
