/*!
 * Sortes Sacrae · 圣杯 (Cups, 水)
 *
 * 情感、关系与灵修生活。与之相应的德行是慈悲与爱德。
 */
import type { CardSeed } from './types';

export const CUPS: readonly CardSeed[] = [
  {
    number: '一',
    name: '圣杯首牌',
    latin: 'Calix Primus · Ace of Cups',
    keywords: ['新情感', '恩宠', '敞开'],
    reversedKeywords: ['封闭', '情感枯竭', '回避亲密'],
    upright: '心门被轻轻叩响。一份新的爱或恩宠正涌进来。',
    reversed: '把杯口按住，既不肯领受，也不肯给出。',
    symbolism: '满溢的圣杯与白鸽——恩宠先临，人只需接手。',
    virtue: '信德（Fides）'
  },
  {
    number: '二',
    name: '圣杯二',
    latin: 'Duo Calices · Two of Cups',
    keywords: ['交换', '和好', '结盟'],
    reversedKeywords: ['失衡', '误会', '貌合神离'],
    upright: '彼此举杯，关系因坦诚而加深。',
    reversed: '一方付出、一方承接，久了就会倾斜。',
    symbolism: '交换的双杯——疗愈始于彼此看见。',
    virtue: '忠贞（Fidelitas）'
  },
  {
    number: '三',
    name: '圣杯三',
    latin: 'Tres Calices · Three of Cups',
    keywords: ['共融', '友谊', '庆祝'],
    reversedKeywords: ['孤立', '闲言', '团体失和'],
    upright: '与同伴共庆。喜乐因分享而加倍。',
    reversed: '热闹之中反而感到孤单，或被流言伤了和气。',
    symbolism: '三人共举花杯——喜悦本是群居之事。',
    virtue: '友爱（Amicitia）'
  },
  {
    number: '四',
    name: '圣杯四',
    latin: 'Quattuor Calices · Four of Cups',
    keywords: ['倦怠', '反思', '错过的邀请'],
    reversedKeywords: ['重新振作', '接受邀请', '走出低潮'],
    upright: '面对眼前的杯却兴味索然。先诚实承认疲倦，再作选择。',
    reversed: '抬起头来，发现那份礼物一直都在。',
    symbolism: '树下的静坐与递来的一杯——麻木之中，恩赐仍在。',
    virtue: '默观（Contemplatio）'
  },
  {
    number: '五',
    name: '圣杯五',
    latin: 'Quinque Calices · Five of Cups',
    keywords: ['失落', '遗憾', '哀悼'],
    reversedKeywords: ['接受', '宽恕', '走出伤痛'],
    upright: '三只杯倾倒，两只仍立。哀悼是真的，剩下的也是真的。',
    reversed: '开始转身，把还站着的杯一一拾起。',
    symbolism: '黑衣人的背影——失去需要被好好哀悼。',
    virtue: '望德（Spes）'
  },
  {
    number: '六',
    name: '圣杯六',
    latin: 'Sex Calices · Six of Cups',
    keywords: ['怀旧', '纯真', '善意'],
    reversedKeywords: ['沉溺过去', '理想化', '拒绝长大'],
    upright: '旧日的温柔仍可取用，但不必停留其中。',
    reversed: '把记忆修饰得太美，以至于无法面对现在。',
    symbolism: '递花的孩童与旧庭院——恩宠藏在记忆里。',
    virtue: '感恩（Gratia）'
  },
  {
    number: '七',
    name: '圣杯七',
    latin: 'Septem Calices · Seven of Cups',
    keywords: ['选择', '幻想', '众多可能'],
    reversedKeywords: ['眼花缭乱', '拖延', '看清现实'],
    upright: '众多选项如云中幻影。求分辨，而非贪全。',
    reversed: '幻象退去，终于看清哪一个是真正要的。',
    symbolism: '云中的七只杯——分辨是选择的前一步。',
    virtue: '明智（Prudentia）'
  },
  {
    number: '八',
    name: '圣杯八',
    latin: 'Octo Calices · Eight of Cups',
    keywords: ['转身', '放下', '更深的意义'],
    reversedKeywords: ['留恋', '反复回头', '害怕失望'],
    upright: '主动离开已无所获之处，去寻更真实的东西。',
    reversed: '明知该走，却一再回头清点旧账。',
    symbolism: '月下离去的背影——放下不是失去，是前进。',
    virtue: '神贫（Paupertas Spiritus）'
  },
  {
    number: '九',
    name: '圣杯九',
    latin: 'Novem Calices · Nine of Cups',
    keywords: ['满足', '愿想成真'],
    reversedKeywords: ['表面风光', '空虚', '过求安逸'],
    upright: '好好享用你所拥有的，并记得它从何而来。',
    reversed: '得到了想要的，却不像想象中那样满足。',
    symbolism: '座上九杯与满足的笑——知足是一种能力。',
    virtue: '节制（Temperantia）'
  },
  {
    number: '十',
    name: '圣杯十',
    latin: 'Decem Calices · Ten of Cups',
    keywords: ['圆满的喜乐', '家', '共融'],
    reversedKeywords: ['家庭裂痕', '关系疏离', '理想落差'],
    upright: '与所爱之人共享的圆满。真实的家并不完美，但有爱。',
    reversed: '期待中的和睦与眼前的现实仍有距离。',
    symbolism: '彩虹下的家人——地上之家的样式，指向天上的家。',
    virtue: '慈爱（Caritas）'
  },
  {
    number: '侍从',
    name: '圣杯侍从',
    latin: 'Famulus Calicis · Page of Cups',
    keywords: ['敏感', '想象', '讯息'],
    reversedKeywords: ['情绪化', '逃避现实', '矫情'],
    upright: '一封心意之信。学会用柔软的方式表达。',
    reversed: '把感受当成武器，或躲在幻想里不肯现身。',
    symbolism: '杯中跃出的鱼——一份意外的温柔讯息。',
    virtue: '虚心（Humilitas）'
  },
  {
    number: '骑士',
    name: '圣杯骑士',
    latin: 'Eques Calicis · Knight of Cups',
    keywords: ['浪漫', '邀约', '追随心意'],
    reversedKeywords: ['空口承诺', '见异思迁'],
    upright: '带着诚意的靠近。理想主义在此刻是一份礼物。',
    reversed: '话说得漂亮，脚跟却不愿站稳。',
    symbolism: '缓步的白马与举杯——温柔也可以是一种勇气。',
    virtue: '忠贞（Fidelitas）'
  },
  {
    number: '王后',
    name: '圣杯王后',
    latin: 'Regina Calicis · Queen of Cups',
    keywords: ['同理', '涵容', '直觉'],
    reversedKeywords: ['情绪勒索', '过度牺牲', '界限模糊'],
    upright: '以同理心承接他人的情绪，也不忘守住自己的水位。',
    reversed: '把别人的情绪全揽在身上，直到自己见底。',
    symbolism: '临水的王座与紧闭的圣杯——包容需要界限。',
    virtue: '慈悲（Misericordia）'
  },
  {
    number: '国王',
    name: '圣杯国王',
    latin: 'Rex Calicis · King of Cups',
    keywords: ['情绪成熟', '宽厚', '稳定'],
    reversedKeywords: ['压抑', '冷漠', '情绪操控'],
    upright: '在风浪中仍能安住，以宽厚对待自己与他人。',
    reversed: '表面平静，底下却是不肯说出口的积压。',
    symbolism: '海上的王座——不动的心，才载得动深水。',
    virtue: '慈爱（Caritas）'
  }
];
