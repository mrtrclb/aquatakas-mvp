import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

const hhmm = (value) => new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const ddmmyyyy = (value) => new Date(value).toLocaleDateString("tr-TR");

// Bir tablo değişince yeniden yükleyen canlı abonelik (RLS geçerli: yalnızca görmeye yetkili olunan satırlar gelir)
function useLiveReload(channelName, table, myId, reload) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    if (!myId) return undefined;
    const channel = supabase
      .channel(channelName + "-" + myId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table }, () => reloadRef.current())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, myId]);
}

// ---------------------------------------------------------------------------
// Mesajlar
// ---------------------------------------------------------------------------
export function useDbMessages(myId) {
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [blocked, setBlocked] = useState(new Set()); // benim engellediklerim
  const drafts = useRef({});

  const reload = useCallback(async () => {
    if (!myId) {
      setConversations([]);
      return;
    }
    const { data: blockRows } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", myId);
    const blockedSet = new Set((blockRows || []).map((row) => row.blocked_id));
    setBlocked(blockedSet);
    const { data: mineRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at, hidden_at")
      .eq("user_id", myId);
    const mine = mineRows || [];
    const ids = mine.map((row) => row.conversation_id);
    if (!ids.length) {
      setConversations([]);
      return;
    }
    const [convRes, partRes, msgRes, reviewRes] = await Promise.all([
      supabase.from("conversations").select("id, topic, listing_id, species_id, last_message_at").in("id", ids),
      supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids).neq("user_id", myId),
      supabase.from("messages").select("id, conversation_id, sender_id, body, created_at").in("conversation_id", ids).order("created_at").limit(3000),
      supabase.from("reviews").select("id, conversation_id, rating, comment, created_at").eq("reviewer_id", myId).in("conversation_id", ids)
    ]);
    const myReviews = Object.fromEntries((reviewRes.data || []).map((row) => [row.conversation_id, row]));
    const others = partRes.data || [];
    const otherIds = Array.from(new Set(others.map((row) => row.user_id)));
    let profileRows = [];
    if (otherIds.length) {
      const { data } = await supabase.from("profiles").select("id, username, city, bio, avatar_url, phone_verified, socials, created_at, pro_until").in("id", otherIds);
      profileRows = data || [];
    }
    const byId = Object.fromEntries(profileRows.map((row) => [row.id, row]));
    const messagesByConv = {};
    (msgRes.data || []).forEach((row) => {
      (messagesByConv[row.conversation_id] = messagesByConv[row.conversation_id] || []).push(row);
    });
    const list = (convRes.data || []).map((conv) => {
      const me = mine.find((row) => row.conversation_id === conv.id) || {};
      const other = others.find((row) => row.conversation_id === conv.id);
      const otherProfile = other ? byId[other.user_id] : null;
      const otherName = otherProfile ? "@" + otherProfile.username : "@silinmis_uye";
      const msgs = messagesByConv[conv.id] || [];
      const last = msgs[msgs.length - 1];
      const unread = msgs.some((row) => row.sender_id !== myId && (!me.last_read_at || new Date(row.created_at) > new Date(me.last_read_at)));
      return {
        id: "dm" + conv.id,
        dbId: conv.id,
        real: true,
        user: otherName,
        otherId: other ? other.user_id : null,
        title: conv.topic,
        last: last ? last.body : "",
        date: ddmmyyyy(last ? last.created_at : conv.last_message_at),
        sortAt: new Date(last ? last.created_at : conv.last_message_at).getTime(),
        unread,
        deleted: Boolean(me.hidden_at),
        listingId: conv.listing_id || null,
        bothSent: msgs.some((row) => row.sender_id === myId) && msgs.some((row) => row.sender_id !== myId),
        myReview: myReviews[conv.id] || null,
        blockedByMe: Boolean(other && blockedSet.has(other.user_id)),
        draft: drafts.current[conv.id] || "",
        messages: msgs.map((row) => ({ from: row.sender_id === myId ? "sen" : otherName, body: row.body, time: hhmm(row.created_at) }))
      };
    });
    list.sort((a, b) => b.sortAt - a.sortAt);
    setProfiles(profileRows);
    setConversations(list);
  }, [myId]);

  useEffect(() => {
    reload();
  }, [reload]);
  useLiveReload("messages", "messages", myId, reload);

  async function start(otherId, topic, listingId = null, draft = "") {
    const { data, error } = await supabase.rpc("start_conversation", {
      p_other: otherId,
      p_topic: topic || "Profil",
      p_listing_id: listingId,
      p_species_id: null
    });
    if (error) throw error;
    if (draft) drafts.current[data] = draft;
    await reload();
    return "dm" + data;
  }

  async function send(dbId, body) {
    delete drafts.current[dbId];
    // İyimser güncelleme: mesaj hemen görünür
    setConversations((prev) =>
      prev.map((conv) =>
        conv.dbId !== dbId ? conv : { ...conv, last: body, unread: false, messages: [...conv.messages, { from: "sen", body, time: hhmm(Date.now()) }] }
      )
    );
    const { error } = await supabase.from("messages").insert({ conversation_id: dbId, body });
    if (error) {
      await reload();
      throw error;
    }
  }

  async function markRead(dbId) {
    setConversations((prev) => prev.map((conv) => (conv.dbId === dbId ? { ...conv, unread: false } : conv)));
    await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", dbId).eq("user_id", myId);
  }

  async function setHidden(dbId, hidden) {
    setConversations((prev) => prev.map((conv) => (conv.dbId === dbId ? { ...conv, deleted: hidden } : conv)));
    await supabase.from("conversation_participants").update({ hidden_at: hidden ? new Date().toISOString() : null }).eq("conversation_id", dbId).eq("user_id", myId);
  }

  async function setBlock(otherId, on) {
    const { error } = on
      ? await supabase.from("user_blocks").insert({ blocker_id: myId, blocked_id: otherId })
      : await supabase.from("user_blocks").delete().eq("blocker_id", myId).eq("blocked_id", otherId);
    if (error && !/duplicate|unique/i.test(error.message)) throw error;
    await reload();
  }

  const unreadCount = conversations.filter((conv) => conv.unread && !conv.deleted && !conv.blockedByMe).length;
  return { conversations, profiles, reload, start, send, markRead, setHidden, setBlock, blocked, unreadCount };
}

// ---------------------------------------------------------------------------
// Bildirimler
// ---------------------------------------------------------------------------
export function useNotifications(myId) {
  const [items, setItems] = useState([]);

  const reload = useCallback(async () => {
    if (!myId) {
      setItems([]);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(id, username, avatar_url), post:posts(slug, text), listing:listings(title), grp:groups(slug, name)")
      .eq("user_id", myId)
      .order("created_at", { ascending: false })
      .limit(60);
    setItems(data || []);
  }, [myId]);

  useEffect(() => {
    reload();
  }, [reload]);
  useLiveReload("notifications", "notifications", myId, reload);

  async function markAllRead() {
    if (!items.some((item) => !item.read_at)) return;
    setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    await supabase.rpc("mark_notifications_read");
  }

  return { items, unread: items.filter((item) => !item.read_at).length, reload, markAllRead };
}

export function notificationText(item) {
  const actor = item.actor ? "@" + item.actor.username : "Biri";
  switch (item.type) {
    case "post_like":
      return actor + " paylaşımını beğendi";
    case "post_comment":
      return actor + " paylaşımına yorum yaptı" + (item.body ? ": “" + item.body.slice(0, 80) + (item.body.length > 80 ? "…" : "") + "”" : "");
    case "comment_like":
      return actor + " yorumunu beğendi";
    case "feature_approved":
      return "Öne çıkarma başvurun onaylandı" + (item.listing ? ": " + item.listing.title : "");
    case "feature_rejected":
      return "Öne çıkarma başvurun reddedildi" + (item.listing ? ": " + item.listing.title : "") + (item.body ? " (" + item.body + ")" : "");
    case "review":
      return actor + " seninle yaptığı alışverişi değerlendirdi" + (item.body ? ": " + item.body : "") + (item.listing ? " · " + item.listing.title : "");
    case "content_removed":
      return "Ekip kararı: " + (item.body || "İçeriğin kaldırıldı") + ". İtiraz için info@aquagram.com.tr";
    case "content_restored":
      return item.body || "İçeriğin yeniden yayında";
    case "ad_approved":
      return "Reklamın onaylandı: " + (item.body || "");
    case "ad_rejected":
      return "Reklamın reddedildi: " + (item.body || "") + " · Reklamlarım'dan düzenleyip yeniden gönderebilirsin";
    case "account_suspended":
      return "Hesabın askıya alındı (" + (item.body || "") + "). Bu sürede paylaşım, yorum, ilan ve mesaj gönderemezsin. İtiraz için info@aquagram.com.tr";
    case "account_restored":
      return item.body || "Hesabındaki kısıtlama kaldırıldı";
    case "report_resolved":
      return item.body || "Bildirdiğin içerik incelendi";
    case "group_closed":
      return "Grubun ekip tarafından kapatıldı: " + (item.body || "");
    case "group_reopened":
      return "Grubun yeniden açıldı: " + (item.body || "");
    case "verification_approved":
      return "Hesabın doğrulandı! " + (item.body || "");
    case "verification_rejected":
      return "Doğrulama talebin onaylanmadı: " + (item.body || "") + " · Bilgilerini düzeltip yeniden başvurabilirsin";
    case "suggestion_approved":
      return "Tür önerin onaylandı: " + (item.body || "") + " · Teşekkürler!";
    case "suggestion_rejected":
      return "Tür önerin bu kez eklenmedi: " + (item.body || "");
    case "group_join":
      return actor + (item.grp ? " " + item.grp.name + " grubuna" : " grubuna") + " katıldı";
    default:
      return item.body || "Yeni bildirim";
  }
}
