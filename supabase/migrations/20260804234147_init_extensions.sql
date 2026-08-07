-- Phase 0: establish the migrations mechanism. Relational schema (profiles,
-- projects, assets, publications) lands with Phase 6 per docs/data-model.md.
create extension if not exists pgcrypto;
