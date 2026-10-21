-- Aquagram — 0009: yabancı anahtar indeksleri (Supabase performans önerileri)
create index if not exists comment_likes_user_idx on public.comment_likes (user_id);
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists post_saves_user_idx on public.post_saves (user_id);
create index if not exists saved_listings_listing_idx on public.saved_listings (listing_id);
create index if not exists species_comments_user_idx on public.species_comments (user_id);
create index if not exists species_favorites_user_idx on public.species_favorites (user_id);
create index if not exists species_comment_likes_user_idx on public.species_comment_likes (user_id);
create index if not exists poll_votes_option_idx on public.poll_votes (option_id);
create index if not exists poll_votes_user_idx on public.poll_votes (user_id);
create index if not exists listing_features_user_idx on public.listing_features (user_id);
create index if not exists ads_advertiser_idx on public.ads (advertiser_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
create index if not exists conversations_listing_idx on public.conversations (listing_id);
create index if not exists conversations_species_idx on public.conversations (species_id);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_id);
create index if not exists species_suggestions_user_idx on public.species_suggestions (user_id);
