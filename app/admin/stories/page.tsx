import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCatalog } from "@/lib/db/catalog";
import { isAdmin, tryLogin } from "@/lib/server/admin-auth";
import { listStories, removeStory, setStoryStatus } from "@/lib/server/stories";
import { storyLine, type Story } from "@/lib/stories";
import { STORY } from "@/lib/copy";
import { STORIES_ADMIN as T } from "../copy";

export const dynamic = "force-dynamic";
export const metadata = { title: T.title, robots: { index: false } };

async function login(fd: FormData) {
  "use server";
  await tryLogin(fd.get("password"));
  redirect("/admin/stories");
}

async function act(fd: FormData) {
  "use server";
  if (!(await isAdmin())) return;
  const id = String(fd.get("id"));
  const a = String(fd.get("action"));
  if (a === "remove") await removeStory(id);
  else if (a === "approved" || a === "rejected" || a === "pending") await setStoryStatus(id, a);
  revalidatePath("/admin/stories");
}

export default async function StoriesAdmin() {
  if (!process.env.ADMIN_PASSWORD) return <p className="pt-10 text-center text-muted-foreground">{T.noPassword}</p>;
  if (!(await isAdmin()))
    return (
      <form action={login} className="mx-auto max-w-sm space-y-3 pt-10" data-testid="stories-login">
        <h1 className="text-xl font-bold">{T.title}</h1>
        <input type="password" name="password" required placeholder={T.password} aria-label={T.password} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <Button type="submit">{T.enter}</Button>
      </form>
    );
  const all = await listStories();
  const uni = new Map(getCatalog().universities.map((u) => [u.id, u.short]));
  const group = (s: Story["status"]) => all.filter((x) => x.status === s);
  const Item = ({ s }: { s: Story }) => (
    <li className="space-y-1 rounded-lg border p-3 text-sm" data-testid="admin-story">
      <p className="font-medium">{storyLine(s, uni.get(s.universityId) ?? s.universityId)}</p>
      <p className="text-xs text-muted-foreground">{T.grad} {s.gradYear} · {T.salary}: {STORY.salaries[s.salary]} · {new Date(s.createdAt).toLocaleString("ru-RU")}</p>
      {s.advice && <p>{T.advice}: {s.advice}</p>}
      <form action={act} className="flex flex-wrap gap-2 pt-1">
        <input type="hidden" name="id" value={s.id} />
        {s.status !== "approved" && <Button size="sm" name="action" value="approved" data-testid="story-approve">{T.approve}</Button>}
        {s.status !== "rejected" && <Button size="sm" variant="outline" name="action" value="rejected">{T.reject}</Button>}
        <Button size="sm" variant="ghost" name="action" value="remove">{T.remove}</Button>
      </form>
    </li>
  );
  return (
    <div className="space-y-6 pt-6" data-testid="stories-admin">
      <h1 className="text-2xl font-bold">{T.title}</h1>
      {(["pending", "approved", "rejected"] as const).map((st) => (
        <Card key={st}>
          <CardHeader><CardTitle className="text-base">{T[st]} ({group(st).length})</CardTitle></CardHeader>
          <CardContent>{group(st).length ? <ul className="space-y-2">{group(st).map((s) => <Item key={s.id} s={s} />)}</ul> : <p className="text-sm text-muted-foreground">{T.empty}</p>}</CardContent>
        </Card>
      ))}
    </div>
  );
}
