import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { setSpeciesCatalog } from "../species.js";

const ts = (value) => (value ? new Date(value).getTime() : Date.now());
const PROFILE_COLS = "id, username, city, bio, avatar_url, phone_verified, socials, created_at, pro_until";

// Veritabanı tür satırını arayüzdeki tür nesnesine çevirir (koddaki örnek veriyle aynı biçim)
export const SPECIES_COLS = "id, slug, name, latin, category_id, kind, difficulty, temperament, description, facts, keywords, is_rare, image_url, images, status, created_at";
export function mapSpeciesRow(row) {
  const images = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
  if (row.image_url && !images.includes(row.image_url)) images.unshift(row.image_url);
  return {
    dbId: row.id,
    slug: String(row.slug),
    name: row.name,
    latin: row.latin || "",
    category: row.category_id,
    kind: row.kind,
    difficulty: row.difficulty || "Orta",
    temperament: row.temperament || null,
    desc: row.description || "",
    facts: Array.isArray(row.facts) ? row.facts.filter((pair) => Array.isArray(pair) && pair[0]) : [],
    keywords: row.keywords || [],
    rare: Boolean(row.is_rare),
    images,
    status: row.status,
    addedAt: ts(row.created_at) + (row.id || 0) // aynı anda eklenenler için kararlı sıra
  };
}

export function mapSpeciesComment(row, slugById, likedSet) {
  return {
    id: "dsc" + row.id,
    dbId: row.id,
    reportType: "species_comment",
    slug: slugById[row.species_id],
    userId: row.user_id,
    text: row.text || "",
    images: row.images || [],
    video: row.video || null,
    createdAt: ts(row.created_at),
    editedAt: row.edited_at ? ts(row.edited_at) : undefined,
    likes: row.like_count || 0,
    likedByMe: likedSet.has(row.id)
  };
}

// Bilgi Bankası verisi: tür kimlikleri, besleyenler, giriş yapan üyenin favorileri, deneyim yorumları
export function useDbKnowledge(myId) {
  const [ids, setIds] = useState({ bySlug: {}, bySpeciesId: {} });
  const [speciesList, setSpeciesList] = useState(null); // yayındaki türler (veritabanından)
  const [keepers, setKeepers] = useState([]); // { species_id, user_id }
  const [favorites, setFavorites] = useState([]); // species_id[] (yalnızca benim)
  const [commentRows, setCommentRows] = useState([]);
  const [likedComments, setLikedComments] = useState(new Set());
  const [profiles, setProfiles] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    let [speciesRes, keepersRes, commentsRes] = await Promise.all([
      supabase.from("species").select(SPECIES_COLS).order("name"),
      supabase.from("species_keepers").select("species_id, user_id").limit(10000),
      supabase
        .from("species_comments")
        .select("id, species_id, user_id, text, images, video, like_count, edited_at, created_at, is_removed")
        .eq("is_removed", false)
        .order("created_at", { ascending: false })
        .limit(1000)
    ]);
    // Tür görselleri sütunu henüz yoksa (0013 uygulanmadan önce) onsuz tekrar dene
    if (speciesRes.error) speciesRes = await supabase.from("species").select(SPECIES_COLS.replace(", images", "")).order("name");
    const bySlug = {};
    const bySpeciesId = {};
    (speciesRes.data || []).forEach((row) => {
      bySlug[String(row.slug)] = row.id;
      bySpeciesId[row.id] = String(row.slug);
    });
    const keeperRows = keepersRes.data || [];
    const rows = commentsRes.data || [];
    let favRows = [];
    let likeRows = [];
    if (myId) {
      const [favRes, likeRes] = await Promise.all([
        supabase.from("species_favorites").select("species_id").eq("user_id", myId),
        supabase.from("species_comment_likes").select("comment_id").eq("user_id", myId)
      ]);
      favRows = favRes.data || [];
      likeRows = likeRes.data || [];
    }
    const userIds = new Set([...keeperRows.map((row) => row.user_id), ...rows.map((row) => row.user_id)]);
    let profileRows = [];
    if (userIds.size) {
      const { data } = await supabase.from("profiles").select(PROFILE_COLS).in("id", Array.from(userIds));
      profileRows = data || [];
    }
    setIds({ bySlug, bySpeciesId });
    const published = (speciesRes.data || []).filter((row) => row.status === "published").map(mapSpeciesRow);
    if (published.length) {
      setSpeciesCatalog(published);
      setSpeciesList(published);
    }
    setKeepers(keeperRows);
    setFavorites(favRows.map((row) => row.species_id));
    setCommentRows(rows);
    setLikedComments(new Set(likeRows.map((row) => row.comment_id)));
    setProfiles(profileRows);
    setLoaded(true);
  }, [myId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // { kullanıcı id → [tür slug] }
  const keeping = {};
  keepers.forEach((row) => {
    const slug = ids.bySpeciesId[row.species_id];
    if (slug) (keeping[row.user_id] = keeping[row.user_id] || []).push(slug);
  });
  const favoriteSlugs = favorites.map((id) => ids.bySpeciesId[id]).filter(Boolean);
  const comments = commentRows.map((row) => mapSpeciesComment(row, ids.bySpeciesId, likedComments)).filter((item) => item.slug);

  return {
    loaded,
    reload,
    speciesList,
    profiles,
    speciesId: (slug) => ids.bySlug[slug],
    keeping,
    favoriteSlugs,
    comments,
    setKeepers,
    setFavorites,
    setCommentRows,
    setLikedComments
  };
}
