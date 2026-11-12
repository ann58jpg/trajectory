import { studentLifeOf } from "@/lib/life";
import { fetchVkEvents, vkDomain } from "@/lib/sources/vk";
import { LIFE } from "@/lib/copy";
import { LifeCore } from "./life-core";

/** «Год в этом вузе» на странице вуза: LifeCore + свежие посты VK о событиях (если задан VK_SERVICE_TOKEN). */
export async function StudentLife({ universityId, site, name }: { universityId: string; site: string; name: string }) {
  const vk = studentLifeOf(universityId)?.communities.find((c) => c.kind === "vk");
  const posts = vk ? await fetchVkEvents(vkDomain(vk.url)) : null;
  return (
    <LifeCore universityId={universityId} site={site} name={name}>
      {posts && posts.length > 0 && (
        <div className="space-y-2" data-testid="life-vk">
          <h3 className="font-semibold">{LIFE.fromVk}</h3>
          <ul className="space-y-1 text-sm">{posts.map((p) => <li key={p.id}><a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{new Date(p.date).toLocaleDateString("ru-RU")} · {p.text}</a></li>)}</ul>
        </div>
      )}
    </LifeCore>
  );
}
