/** Modèle aligné sur l’API MySQL / réponses JSON */

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  listing_type: string;
  price: number;
  price_period: string | null;
  condition: string;
  location: string | null;
  images: string[] | null;
  is_active: boolean;
  status: "available" | "reserved" | "sold";
  /** Fiche technique masquée (contact boutique), non exposée au catalogue public. */
  is_contact_hub?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingsPageResponse {
  items: Listing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  /** Seuls les comptes `admin` peuvent publier le catalogue. */
  role?: "user" | "admin";
}

export type ConversationThreadStatus = "unread" | "needs_reply" | "waiting" | "neutral";

export interface ConversationRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  /** Conversation liée à la fiche « contact boutique ». */
  is_contact_hub?: boolean;
  /** Interlocuteur affiché : client (côté admin) ou boutique (côté client). */
  peer_display_name?: string | null;
  /** Renseigné pour l’admin : email du client ou de la boutique. */
  peer_email?: string | null;
  listings: { title: string; images: string[] };
  /** Dernier message (extrait), si disponible. */
  last_message_preview?: string | null;
  last_message_at?: string | null;
  /** Message(s) de l’interlocuteur non lus depuis la dernière ouverture du fil. */
  unread?: boolean;
  /** État du fil pour badges (Sprint 2). */
  thread_status?: ConversationThreadStatus;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read: boolean;
  created_at: string;
}
