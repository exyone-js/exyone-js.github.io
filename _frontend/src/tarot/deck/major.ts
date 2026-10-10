/*!
 * Sortes Sacrae · 大阿卡纳 (Major Arcana, 22 cards)
 *
 * Each entry pairs the traditional tarot reading with a 德行 (virtue) drawn
 * from the Catholic moral tradition. That pairing is an editorial gloss for a
 * devotional-styled toy — it is not doctrine and carries no ecclesiastical
 * authority; see the disclaimer on `/tarot/about/`.
 */
import type { CardSeed } from './types';

export const MAJOR_ELEMENT = '灵';

export const MAJORS: readonly CardSeed[] = [
  {
    number: '0',
    name: '愚者',
    latin: 'Stultus · The Fool',
    keywords: ['纯真', '启程', '信靠'],
    reversedKeywords: ['鲁莽', '逃避', '犹疑'],
    upright: '像孩子一样轻装上路，把未知道路交托出去。新的旅程与新的可能正在展开，此时最需要的是迈步，而不是万全。',
    reversed: '未经思虑的冒险，或以玩世不恭掩饰恐惧。脚步踌躇，迟迟不肯迈出那一步。',
    symbolism: '悬崖边的行囊与白犬——一无所有地出发，唯有信任为伴。',
    virtue: '神贫（Paupertas Spiritus）'
  },
  {
    number: 'I',
    name: '魔术师',
    latin: 'Magus · The Magician',
    keywords: ['才能', '行动', '资源'],
    reversedKeywords: ['欺瞒', '空谈', '才能错置'],
    upright: '才具与资源都已在手中，正是着手实践的时机。意图清楚时，万物皆可成为器皿。',
    reversed: '巧言令色，或志大才疏；把天赋用来操弄，而非建造。',
    symbolism: '桌上的四元素器皿——受造之物都是工具，关键在于持器者的心。',
    virtue: '明智（Prudentia）'
  },
  {
    number: 'II',
    name: '女祭司',
    latin: 'Sacerdotissa · The High Priestess',
    keywords: ['直觉', '静默', '内在知识'],
    reversedKeywords: ['失联', '隐情', '疏离'],
    upright: '尚未言明的答案其实已在心中。适合静观、聆听，而不是急着求解。',
    reversed: '与内在失联，或被隐瞒的信息搅扰；表面的喧哗盖住了真相。',
    symbolism: '帷幕与双柱——圣所之内，言语让位于静默。',
    virtue: '默观（Contemplatio）'
  },
  {
    number: 'III',
    name: '皇后',
    latin: 'Imperatrix · The Empress',
    keywords: ['丰饶', '慈爱', '孕育'],
    reversedKeywords: ['耗竭', '依附', '疏于照料'],
    upright: '生命被温柔滋养而结出果实。这是创造、照料与接纳的时期。',
    reversed: '付出过度而枯竭，或以爱之名行掌控之实。',
    symbolism: '麦田与石榴——大地的慷慨，映照造物主的眷顾。',
    virtue: '慈爱（Caritas）'
  },
  {
    number: 'IV',
    name: '皇帝',
    latin: 'Imperator · The Emperor',
    keywords: ['秩序', '权柄', '稳固'],
    reversedKeywords: ['僵化', '专断', '失序'],
    upright: '以纪律与责任建立秩序。界线清楚，众人才得安稳。',
    reversed: '固执于掌控，权威成了压迫，结构反噬其内。',
    symbolism: '石座与权杖——权柄来自守护，而非支配。',
    virtue: '坚忍（Fortitudo）'
  },
  {
    number: 'V',
    name: '教皇',
    latin: 'Pontifex · The Hierophant',
    keywords: ['传承', '教导', '共融'],
    reversedKeywords: ['教条', '形式主义', '离心'],
    upright: '在传统与团体中获得引路。请益长者，学习既有的智慧。',
    reversed: '只剩外壳的仪式，或为反叛而反叛；需要分辨何为本质。',
    symbolism: '三重冠与交叉的钥匙——教导的职分，是服事而非凌驾。',
    virtue: '虔敬（Pietas）'
  },
  {
    number: 'VI',
    name: '恋人',
    latin: 'Amantes · The Lovers',
    keywords: ['结合', '抉择', '坦诚'],
    reversedKeywords: ['摇摆', '失衡', '诱惑'],
    upright: '因爱而作出的选择；关系里的坦诚与彼此交托。',
    reversed: '价值摇摆，或因惧怕失去而不敢说真话。',
    symbolism: '园中的祝福——自由的选择，才是爱的形状。',
    virtue: '忠贞（Fidelitas）'
  },
  {
    number: 'VII',
    name: '战车',
    latin: 'Currus · The Chariot',
    keywords: ['意志', '前行', '自律'],
    reversedKeywords: ['失控', '躁进', '方向不明'],
    upright: '情绪与理智同驾一车，以自律换取前进。胜利属于能驾驭自己的人。',
    reversed: '被冲动拖着走，或用力过猛而偏离方向。',
    symbolism: '一黑一白的两头兽——相争的两股力量，须由意志统御。',
    virtue: '自制（Temperantia）'
  },
  {
    number: 'VIII',
    name: '力量',
    latin: 'Fortitudo · Strength',
    keywords: ['刚毅', '温柔', '驯服'],
    reversedKeywords: ['虚弱', '压抑', '逞强'],
    upright: '以温柔驯服野性。真正的力量是忍耐，而不是压制。',
    reversed: '用强硬掩饰不安，或以退让回避必要的坚持。',
    symbolism: '抚狮的女子——恩宠使猛兽俯首。',
    virtue: '刚毅（Fortitudo）'
  },
  {
    number: 'IX',
    name: '隐者',
    latin: 'Eremita · The Hermit',
    keywords: ['内省', '独处', '指引'],
    reversedKeywords: ['孤僻', '封闭', '拒绝援助'],
    upright: '退居静处以辨明道路。一盏灯，足以照亮下一步。',
    reversed: '独处成了隔绝，或在自省中过度苛责自己。',
    symbolism: '旷野中的提灯——光照不在于远近，而在于诚实。',
    virtue: '明智（Prudentia）'
  },
  {
    number: 'X',
    name: '命运之轮',
    latin: 'Rota Fortunae · Wheel of Fortune',
    keywords: ['转机', '循环', '天意'],
    reversedKeywords: ['停滞', '失控', '徒劳'],
    upright: '境遇轮转，顺逆皆有定时。在变化中辨认更高的安排。',
    reversed: '抗拒必然的改变，或被无力感困住。',
    symbolism: '转动的轮与四方的行者——唯有圆心不动。',
    virtue: '望德（Spes）'
  },
  {
    number: 'XI',
    name: '正义',
    latin: 'Iustitia · Justice',
    keywords: ['公道', '权衡', '承担'],
    reversedKeywords: ['偏颇', '推诿', '苛责'],
    upright: '如实衡量，并承担结果。诚实使天平归位。',
    reversed: '双重标准或推诿责任，让是非变得模糊。',
    symbolism: '天平与剑——慈悲不废公义。',
    virtue: '公义（Iustitia）'
  },
  {
    number: 'XII',
    name: '倒吊人',
    latin: 'Suspensus · The Hanged Man',
    keywords: ['顺服', '等待', '换位'],
    reversedKeywords: ['拖延', '徒劳的牺牲', '僵持'],
    upright: '一种主动的等待。暂时放下掌控，视野随之翻转。',
    reversed: '以牺牲之名逃避抉择，或迟迟不愿松手。',
    symbolism: '倒悬却安然的面容——舍下，即是获得。',
    virtue: '顺命（Oboedientia）'
  },
  {
    number: 'XIII',
    name: '死神',
    latin: 'Mors · Death',
    keywords: ['终结', '蜕变', '放手'],
    reversedKeywords: ['抗拒', '滞留', '慢性耗损'],
    upright: '旧形态必然结束，为新生腾出位置。哀悼与告别，都是过程的一部分。',
    reversed: '紧抓已逝之物，让转变迟迟无法完成。',
    symbolism: '白马与花朵——收割之后，土地得以更新。',
    virtue: '悔改（Metanoia）'
  },
  {
    number: 'XIV',
    name: '节制',
    latin: 'Temperantia · Temperance',
    keywords: ['调和', '耐心', '中道'],
    reversedKeywords: ['失衡', '极端', '焦躁'],
    upright: '在两杯之间细细调和。不急不缓，让时间完成它的工作。',
    reversed: '冷热无常，或一再越界却难以自律。',
    symbolism: '天使手中的双杯——恩宠与努力彼此相调。',
    virtue: '节制（Temperantia）'
  },
  {
    number: 'XV',
    name: '恶魔',
    latin: 'Diabolus · The Devil',
    keywords: ['捆绑', '成瘾', '阴影'],
    reversedKeywords: ['觉察', '松绑', '直面'],
    upright: '看清捆绑自己的究竟是什么。锁链看似坚固，锁扣却不在他手上。',
    reversed: '开始觉察并松开束缚，或终于承认软弱而求助。',
    symbolism: '松垮的锁链——试探之所以有力，是因为我们默许。',
    virtue: '警醒（Vigilantia）'
  },
  {
    number: 'XVI',
    name: '塔',
    latin: 'Turris · The Tower',
    keywords: ['崩塌', '揭露', '冲击'],
    reversedKeywords: ['延后的崩坏', '勉强支撑'],
    upright: '虚假的根基被击碎。摇晃之后，才有真实可言。',
    reversed: '明知摇摇欲坠却不肯面对，让代价累积得更久。',
    symbolism: '被闪电击中的高塔——建立在骄傲上的，终必动摇。',
    virtue: '谦卑（Humilitas）'
  },
  {
    number: 'XVII',
    name: '星星',
    latin: 'Stella · The Star',
    keywords: ['希望', '疗愈', '指引'],
    reversedKeywords: ['气馁', '幻灭', '失去方向'],
    upright: '风暴之后的宁静夜空。安慰来到，伤口开始愈合。',
    reversed: '信心动摇，觉得盼望遥不可及。',
    symbolism: '倾水的水罐与八芒的星——恩宠倾注，旷野生泉。',
    virtue: '望德（Spes）'
  },
  {
    number: 'XVIII',
    name: '月亮',
    latin: 'Luna · The Moon',
    keywords: ['幽微', '迷雾', '试炼'],
    reversedKeywords: ['迷雾散去', '真相浮现', '被幻想所困'],
    upright: '走在微光中，所见未全。此时更需要信靠，而非急着定论。',
    reversed: '迷雾渐散，或被焦虑与幻象牵着走。',
    symbolism: '月下的双塔与犬狼——夜路中，人最易失去分辨。',
    virtue: '信德（Fides）'
  },
  {
    number: 'XIX',
    name: '太阳',
    latin: 'Sol · The Sun',
    keywords: ['喜乐', '清明', '活力'],
    reversedKeywords: ['强颜欢笑', '疲惫', '光亮被遮'],
    upright: '光正照着，事情得以显明并结实。这是一种坦然的喜乐。',
    reversed: '强撑的热闹，或因过劳而失去光亮。',
    symbolism: '围墙内的孩童与向日葵——单纯而饱满的喜乐。',
    virtue: '喜乐（Gaudium）'
  },
  {
    number: 'XX',
    name: '审判',
    latin: 'Iudicium · Judgement',
    keywords: ['觉醒', '召叫', '复起'],
    reversedKeywords: ['自责', '充耳不闻', '旧事缠身'],
    upright: '听见召唤而起身。过往被清算，也成为新的起点。',
    reversed: '被愧疚困住，或对内心的声音装作不闻。',
    symbolism: '号角与复起的身影——一个更真实的自己正在回应。',
    virtue: '悔改（Metanoia）'
  },
  {
    number: 'XXI',
    name: '世界',
    latin: 'Mundus · The World',
    keywords: ['圆满', '整合', '完成'],
    reversedKeywords: ['未竟', '拖延收尾', '遗憾'],
    upright: '一个周期完整落下帷幕，所学得以整合。可以道谢，然后前行。',
    reversed: '只差最后一步却迟迟不收尾，或对结果仍不甘心。',
    symbolism: '花环中的舞者与四活物——万物各就其位。',
    virtue: '圆满（Perfectio）'
  }
];
