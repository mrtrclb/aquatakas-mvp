import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { shrinkImage } from "./listings";
import { compressVideo } from "./media-compress";

const ts = (value) => (value ? new Date(value).getTime() : Date.now());

export function mapComment(row, likedSet) {
  return {
    id: "dc" + row.id,
    dbId: row.id,
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

export function mapPost(row, ctx) {
  const options = (row.poll_options || []).slice().sort((a, b) => a.position - b.position);
  return {
    id: "dp" + row.id,
    dbId: row.id,
    real: true,
    slug: row.slug,
    userId: row.user_id,
    groupId: row.group_id ? ctx.groupKey(row.group_id) : null,
    dbGroupId: row.group_id,
    kind: row.kind,
    speciesSlugs: row.species_slugs || [],
    productSlugs: row.product_slugs || [],
    ratedProduct: row.rated_product || null,
    rating: row.rating || null,
    text: row.text || "",
    images: row.images || [],
    video: row.video || null,
    poll: row.poll_ends_at
      ? {
          options: options.map((option) => ({ id: option.id, text: option.text, votes: option.vote_count })),
          votedId: ctx.votes.get(row.id) ?? null,
          endsAt: ts(row.poll_ends_at)
        }
      : null,
    likes: row.like_count || 0,
    likedByMe: ctx.likes.has(row.id),
    savedByMe: ctx.saves.has(row.id),
    createdAt: ts(row.created_at),
    comments: (row.comments || [])
      .filter((comment) => !comment.is_removed)
      .sort((a, b) => ts(a.created_at) - ts(b.created_at))
      .map((comment) => mapComment(comment, ctx.commentLikes))
  };
}

const POST_SELECT =
  "*, poll_options(id, position, text, vote_count), comments(id, user_id, text, images, video, like_count, edited_at, created_at, is_removed)";

// Topluluk verisi: paylaşımlar, yorumlar, gruplar, üyelikler ve giriş yapan üyenin beğeni/kayıt/oy/etiket takibi
export function useDbCommunity(myId) {
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [mine, setMine] = useState({ likes: new Set(), saves: new Set(), commentLikes: new Set(), votes: new Map(), tags: [] });
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [postsRes, groupsRes, membersRes] = await Promise.all([
      supabase.from("posts").select(POST_SELECT).eq("is_removed", false).order("created_at", { ascending: false }).limit(300),
      supabase.from("groups").select("*").order("created_at"),
      supabase.from("group_members").select("group_id, user_id, role")
    ]);
    const postRows = postsRes.data || [];
    const memberRows = membersRes.data || [];
    const groupRows = groupsRes.data || [];
    const ids = new Set();
    postRows.forEach((post) => {
      ids.add(post.user_id);
      (post.comments || []).forEach((comment) => ids.add(comment.user_id));
    });
    memberRows.forEach((member) => ids.add(member.user_id));
    groupRows.forEach((group) => group.owner_id && ids.add(group.owner_id));
    let profileRows = [];
    if (ids.size) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, city, bio, avatar_url, phone_verified, socials, created_at, pro_until")
        .in("id", Array.from(ids));
      profileRows = data || [];
    }
    let nextMine = { likes: new Set(), saves: new Set(), commentLikes: new Set(), votes: new Map(), tags: [] };
    if (myId) {
      const [likes, saves, commentLikes, votes, tags] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", myId),
        supabase.from("post_saves").select("post_id").eq("user_id", myId),
        supabase.from("comment_likes").select("comment_id").eq("user_id", myId),
        supabase.from("poll_votes").select("post_id, option_id").eq("user_id", myId),
        supabase.from("tag_follows").select("tag").eq("user_id", myId)
      ]);
      nextMine = {
        likes: new Set((likes.data || []).map((row) => row.post_id)),
        saves: new Set((saves.data || []).map((row) => row.post_id)),
        commentLikes: new Set((commentLikes.data || []).map((row) => row.comment_id)),
        votes: new Map((votes.data || []).map((row) => [row.post_id, row.option_id])),
        tags: (tags.data || []).map((row) => "#" + String(row.tag).replace(/^#/, ""))
      };
    }
    setProfiles(profileRows);
    setGroups(groupRows);
    setMembers(memberRows);
    setMine(nextMine);
    setRows(postRows);
    setLoaded(true);
  }, [myId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, setRows, groups, members, profiles, mine, setMine, loaded, reload };
}

// blob: adresindeki (önizleme) dosyayı Supabase depolamasına yükler, herkese açık adresi döner
export async function uploadBlobUrl(userId, folder, blobUrl, nameHint = "", onProgress = null) {
  const response = await fetch(blobUrl);
  let blob = await response.blob();
  const isImage = /^image\//.test(blob.type);
  if (isImage && blob.type !== "image/gif") blob = await shrinkImage(blob);
  else if (/^video\//.test(blob.type) || /\.(mp4|mov|webm|m4v)$/i.test(nameHint)) blob = await compressVideo(blob, onProgress);
  const type = blob.type || "application/octet-stream";
  const ext = (type.split("/")[1] || nameHint.split(".").pop() || "bin").replace("jpeg", "jpg").replace("quicktime", "mov");
  const path = userId + "/" + folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
  const { error } = await supabase.storage.from("community-media").upload(path, blob, { contentType: type });
  if (error) throw error;
  return supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl;
}

// Paylaşım/yorumdaki görselleri ve video dosyasını yükler (bağlantı videoları olduğu gibi kalır)
export async function uploadMedia(userId, folder, images = [], video = null, onVideoProgress = null) {
  const outImages = [];
  for (const url of images) outImages.push(url.startsWith("blob:") ? await uploadBlobUrl(userId, folder, url) : url);
  let outVideo = video;
  if (video && video.kind === "file" && String(video.url).startsWith("blob:")) {
    outVideo = { ...video, url: await uploadBlobUrl(userId, folder, video.url, video.name || "", onVideoProgress) };
  }
  return { images: outImages, video: outVideo };
}
