import { env } from '../config';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author_name: string;
  author_avatar: string;
  category: string;
  tags: string[];
  read_time: number;
  published: boolean;
  views: number;
  created_at: string;
  updated_at: string;
}

export type BlogPostInsert = Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'views'>;

const headers = () => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
});

const BASE = () => `${env.SUPABASE_URL}/rest/v1/blog_posts`;

export async function fetchAllPosts(): Promise<BlogPost[]> {
  const res = await fetch(`${BASE()}?select=*&order=created_at.desc`, { headers: headers() });
  if (!res.ok) throw new Error(`Erro ao buscar posts: ${res.status}`);
  return res.json();
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  const res = await fetch(`${BASE()}?slug=eq.${encodeURIComponent(slug)}&limit=1`, { headers: headers() });
  if (!res.ok) throw new Error(`Erro ao buscar post: ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
}

export async function createPost(data: BlogPostInsert & { created_at?: string }): Promise<BlogPost> {
  const res = await fetch(BASE(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao criar post: ${err}`);
  }
  const rows = await res.json();
  return rows[0];
}

export async function updatePost(id: string, data: Partial<BlogPostInsert>): Promise<BlogPost> {
  const res = await fetch(`${BASE()}?id=eq.${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao atualizar post: ${err}`);
  }
  const rows = await res.json();
  return rows[0];
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`${BASE()}?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Erro ao excluir post: ${res.status}`);
}

export async function togglePublished(id: string, published: boolean): Promise<BlogPost> {
  return updatePost(id, { published } as Partial<BlogPostInsert>);
}
