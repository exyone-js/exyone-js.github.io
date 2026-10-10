/*!
 * Sortes Sacrae · 牌阵 (spreads)
 *
 * Pure data, shared by the build-time generator (which renders the picker and
 * the about page) and by the browser bundle (which lays out the draw table and
 * the reading). `layout` maps to a `.spread--<layout>` CSS class; the i-th
 * position always lands in the i-th slot of that layout.
 */

export interface SpreadPosition {
  /** Position name, e.g. 信德. */
  label: string;
  /** Latin subscript. */
  latin: string;
  /** What this position is asking about. */
  hint: string;
}

export interface Spread {
  id: string;
  name: string;
  latin: string;
  /** Scripture line shown under the title. */
  motto: string;
  /** One-sentence pitch for the picker card. */
  summary: string;
  /** How to use this spread. */
  guide: string;
  /** CSS modifier: `.spread--<layout>`. */
  layout: string;
  /** Cards drawn, in the order they fill the layout. */
  positions: readonly SpreadPosition[];
}

export const SPREADS: readonly Spread[] = [
  {
    id: 'signum',
    name: '圣言一牌',
    latin: 'Signum',
    motto: '「求你使我清晨得闻你的慈爱，因为我倚靠你。」（咏 143:8）',
    summary: '只抽一张。为今天定一个默想的方向。',
    guide: '静下来，把今天最挂心的一件事交给这一次抽牌，然后翻开一张。',
    layout: 'signum',
    positions: [
      {
        label: '今日圣言',
        latin: 'Verbum Hodiernum',
        hint: '今天最值得放在心上的一句话、一份提醒。'
      }
    ]
  },
  {
    id: 'tria',
    name: '信望爱三德阵',
    latin: 'Tria',
    motto: '「现今存在的，有信、望、爱这三样，但其中最大的是爱。」（格前 13:13）',
    summary: '三张牌，检视一件心事里的信、望、爱。',
    guide: '适合问一件正在走的路：我信的是什么？我盼望什么？我爱的是谁？',
    layout: 'tria',
    positions: [
      {
        label: '信德',
        latin: 'Fides',
        hint: '你所立足、所信靠的究竟是什么。'
      },
      {
        label: '望德',
        latin: 'Spes',
        hint: '在等待之中，你所能盼望的方向。'
      },
      {
        label: '爱德',
        latin: 'Caritas',
        hint: '这件事里，爱要求你如何去行。'
      }
    ]
  },
  {
    id: 'crux',
    name: '圣十字阵',
    latin: 'Crux',
    motto: '「你们求，必要给你们；你们找，必要找着。」（玛 7:7）',
    summary: '五张牌，看清此刻的处境与可用的助力。',
    guide: '适合问一个具体的决定：现况是什么，什么在拦我，什么能帮我。',
    layout: 'crux',
    positions: [
      {
        label: '此刻',
        latin: 'In Medio',
        hint: '你真正站立的位置，与事情的核心。'
      },
      {
        label: '恩宠',
        latin: 'Gratia',
        hint: '已经赐下、却可能被忽略的那份帮助。'
      },
      {
        label: '根基',
        latin: 'Fundamentum',
        hint: '这一切底下真正的地基，往往是旧事。'
      },
      {
        label: '阻碍',
        latin: 'Impedimentum',
        hint: '挡在路上、需要被诚实面对的东西。'
      },
      {
        label: '助力',
        latin: 'Auxilium',
        hint: '可以立刻取用的人、资源或态度。'
      }
    ]
  },
  {
    id: 'viae',
    name: '双途阵',
    latin: 'Duae Viae',
    motto: '「你们应站在路上察看，探问旧路——那是善道，便行在其间。」（耶 6:16）',
    summary: '六张牌，把两条路各看到底。',
    guide: '适合二选一：先在纸上写下甲、乙两条路，再依序翻开六张。',
    layout: 'viae',
    positions: [
      { label: '甲途 · 开端', latin: 'Via Prima · Initium', hint: '选择甲路，最先会遇到什么。' },
      { label: '甲途 · 代价', latin: 'Via Prima · Pretium', hint: '走甲路必须付上的代价。' },
      { label: '甲途 · 收获', latin: 'Via Prima · Fructus', hint: '甲路最终会长成什么样子。' },
      { label: '乙途 · 开端', latin: 'Via Altera · Initium', hint: '选择乙路，最先会遇到什么。' },
      { label: '乙途 · 代价', latin: 'Via Altera · Pretium', hint: '走乙路必须付上的代价。' },
      { label: '乙途 · 收获', latin: 'Via Altera · Fructus', hint: '乙路最终会长成什么样子。' }
    ]
  },
  {
    id: 'rosarium',
    name: '七德阵',
    latin: 'Rosarium',
    motto: '「圣神的效果是：仁爱、喜乐、平安、忍耐、良善、温和、忠信、柔和、节制。」（迦 5:22-23）',
    summary: '七张牌，围绕七种德行查验自己。',
    guide: '适合一段长时间的自我检视，例如月初或避静之前。',
    layout: 'rosarium',
    positions: [
      { label: '信德', latin: 'Fides', hint: '我真正信靠的是什么。' },
      { label: '望德', latin: 'Spes', hint: '我仍在盼望什么，或已经放弃盼望什么。' },
      { label: '爱德', latin: 'Caritas', hint: '爱在我身上是否还活着。' },
      { label: '明智', latin: 'Prudentia', hint: '我该在何处放慢、何处加快。' },
      { label: '公义', latin: 'Iustitia', hint: '我亏欠了谁，需要如何补还。' },
      { label: '刚毅', latin: 'Fortitudo', hint: '哪一件事，我不能再回避。' },
      { label: '节制', latin: 'Temperantia', hint: '哪一处失了分寸，需要收回。' }
    ]
  },
  {
    id: 'magnus',
    name: '大十字阵',
    latin: 'Magnus Ordo',
    motto: '「事事有时节，天下任何事皆有定时。」（训 3:1）',
    summary: '十张牌。最完整的一次梳理，看清来龙去脉。',
    guide: '牌较多，请预留一段安静的时间；适合季度回顾或重大抉择。',
    layout: 'magnus',
    positions: [
      { label: '现况', latin: 'Status', hint: '此刻的中心，事情本来的样子。' },
      { label: '阻力', latin: 'Impedimentum', hint: '横在现况之上的那股力量。' },
      { label: '根源', latin: 'Radix', hint: '这一切底下真正的地基。' },
      { label: '将逝', latin: 'Occasus', hint: '正在退场、该放手的东西。' },
      { label: '显意识', latin: 'Conscium', hint: '你清楚知道并挂在心上的。' },
      { label: '潜意识', latin: 'Subconscium', hint: '你还未承认，却已在影响你的。' },
      { label: '自我', latin: 'Ipse', hint: '你在这件事里的姿态与位置。' },
      { label: '环境', latin: 'Ambitus', hint: '他人与处境带给你的影响。' },
      { label: '希望与恐惧', latin: 'Spes et Timor', hint: '你所期待与所害怕的，往往是同一件事。' },
      { label: '归宿', latin: 'Exitum', hint: '若一切照现状发展，最可能的落点。' }
    ]
  }
];

const SPREAD_BY_ID: ReadonlyMap<string, Spread> = new Map(SPREADS.map(s => [s.id, s]));

export function spreadById(id: string | null | undefined): Spread | undefined {
  return typeof id === 'string' ? SPREAD_BY_ID.get(id) : undefined;
}

export const DEFAULT_SPREAD_ID = 'tria';
