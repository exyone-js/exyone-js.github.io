/*!
 * Sortes Sacrae · 宝剑 (Swords, 风)
 *
 * 思辨、言语与试炼。与之相应的德行是真理与明辨。
 */
import type { CardSeed } from './types';

export const SWORDS: readonly CardSeed[] = [
  {
    number: '一',
    name: '宝剑首牌',
    latin: 'Gladius Primus · Ace of Swords',
    keywords: ['明晰', '真相', '决断'],
    reversedKeywords: ['混乱', '误判', '言语伤人'],
    upright: '一道清明的光照进混乱。用诚实的话切开纠缠。',
    reversed: '话说得太快太利，真相反被割碎。',
    symbolism: '云中握剑的手——真理先是礼物，后是要求。',
    virtue: '真理（Veritas）'
  },
  {
    number: '二',
    name: '宝剑二',
    latin: 'Duo Gladii · Two of Swords',
    keywords: ['僵局', '回避', '权衡'],
    reversedKeywords: ['打破僵局', '被迫面对', '真相浮现'],
    upright: '两难之间闭目权衡。真正卡住的，是不愿承认的那个答案。',
    reversed: '蒙眼的布被拿掉，再拖也拖不下去了。',
    symbolism: '蒙眼与交叉的双剑——中立有时只是拖延。',
    virtue: '明智（Prudentia）'
  },
  {
    number: '三',
    name: '宝剑三',
    latin: 'Tres Gladii · Three of Swords',
    keywords: ['心碎', '直言', '必要的痛'],
    reversedKeywords: ['愈合', '宽恕', '停止自我伤害'],
    upright: '被真话刺伤，但只有看清伤口，才能开始痊愈。',
    reversed: '伤口开始结痂，请别再亲手把它揭开。',
    symbolism: '雨中的三剑与心——痛楚若被承认，便不再是终点。',
    virtue: '刚毅（Fortitudo）'
  },
  {
    number: '四',
    name: '宝剑四',
    latin: 'Quattuor Gladii · Four of Swords',
    keywords: ['休息', '静养', '暂停'],
    reversedKeywords: ['倦怠未复', '焦虑难眠', '被迫停摆'],
    upright: '主动退下休养。恢复不是懒散，而是必要的准备。',
    reversed: '停是停了，心却一刻也没有歇。',
    symbolism: '石棺上的静卧——安息是恩赐，不是浪费。',
    virtue: '节制（Temperantia）'
  },
  {
    number: '五',
    name: '宝剑五',
    latin: 'Quinque Gladii · Five of Swords',
    keywords: ['争胜', '算计', '胜负心'],
    reversedKeywords: ['和解', '放下身段', '止住伤害'],
    upright: '赢了争论，可能输了关系。看清胜负的代价。',
    reversed: '主动收剑，把「谁对」换成「我们还好吗」。',
    symbolism: '拾剑者与离去者——赢家的脸上并没有喜乐。',
    virtue: '谦卑（Humilitas）'
  },
  {
    number: '六',
    name: '宝剑六',
    latin: 'Sex Gladii · Six of Swords',
    keywords: ['过渡', '离开风暴', '求援'],
    reversedKeywords: ['滞留', '旧创未愈', '无法前行'],
    upright: '船正驶向平静。承认自己需要被带走。',
    reversed: '人离了岸，心还留在原地。',
    symbolism: '渡船与披斗篷的人——离开也是一种治疗。',
    virtue: '望德（Spes）'
  },
  {
    number: '七',
    name: '宝剑七',
    latin: 'Septem Gladii · Seven of Swords',
    keywords: ['策略', '隐瞒', '独行'],
    reversedKeywords: ['被揭穿', '坦白', '良心不安'],
    upright: '以技巧避开正面冲突。请检查手段是否配得上目的。',
    reversed: '纸包不住火，或终于选择把话摊开。',
    symbolism: '抱剑潜行的身影——聪明与狡诈，仅一线之隔。',
    virtue: '诚实（Veracitas）'
  },
  {
    number: '八',
    name: '宝剑八',
    latin: 'Octo Gladii · Eight of Swords',
    keywords: ['受困感', '限制', '自缚'],
    reversedKeywords: ['松绑', '看见出路', '重获自由'],
    upright: '束缚比看起来松。走出困境的第一步，是承认选择权还在。',
    reversed: '开始挪动手脚，发现绳结原来不紧。',
    symbolism: '围困的八剑与空出的路——牢笼往往没有锁。',
    virtue: '信德（Fides）'
  },
  {
    number: '九',
    name: '宝剑九',
    latin: 'Novem Gladii · Nine of Swords',
    keywords: ['焦虑', '失眠', '想象的恐惧'],
    reversedKeywords: ['天光渐亮', '说出恐惧', '得到安慰'],
    upright: '夜里被恐惧放大的一切，白日多半会缩小。说出来，就会减轻。',
    reversed: '把担心说给一个人听，夜色就不再那么厚。',
    symbolism: '掩面的坐者与九剑——恐惧最怕被说出口。',
    virtue: '望德（Spes）'
  },
  {
    number: '十',
    name: '宝剑十',
    latin: 'Decem Gladii · Ten of Swords',
    keywords: ['终结', '彻底的尽头', '黎明'],
    reversedKeywords: ['复原', '缓慢好转', '拒绝终结'],
    upright: '最坏的已经过去。让这一页结束，天边正在发白。',
    reversed: '伤口还在，但已经不再流血。',
    symbolism: '背上的十剑与破晓的东方——尽头之后是清晨。',
    virtue: '望德（Spes）'
  },
  {
    number: '侍从',
    name: '宝剑侍从',
    latin: 'Famulus Gladii · Page of Swords',
    keywords: ['好学', '警醒', '探问'],
    reversedKeywords: ['多疑', '搬弄是非', '浅尝辄止'],
    upright: '以提问代替论断。保持清醒，也保持礼貌。',
    reversed: '把好奇变成打探，把机敏变成尖酸。',
    symbolism: '迎着风的少年——刨根问底需要勇气，也需要分寸。',
    virtue: '明智（Prudentia）'
  },
  {
    number: '骑士',
    name: '宝剑骑士',
    latin: 'Eques Gladii · Knight of Swords',
    keywords: ['果决', '直进', '无所畏惧'],
    reversedKeywords: ['好辩', '急躁', '不顾后果'],
    upright: '需要有人说出真话并立刻行动时，他会出现。',
    reversed: '为了赢而说，而不是为了真。',
    symbolism: '逆风疾驰的白马——直言也会伤人。',
    virtue: '公义（Iustitia）'
  },
  {
    number: '王后',
    name: '宝剑王后',
    latin: 'Regina Gladii · Queen of Swords',
    keywords: ['清醒', '独立', '公私分明'],
    reversedKeywords: ['尖刻', '冷漠', '苛责'],
    upright: '以清楚的界线与诚实的言语守护彼此。',
    reversed: '用锐利保护自己，也顺手伤到了靠近的人。',
    symbolism: '举剑的王座与云上飞鸟——觉察先于反应。',
    virtue: '明辨（Discretio）'
  },
  {
    number: '国王',
    name: '宝剑国王',
    latin: 'Rex Gladii · King of Swords',
    keywords: ['律法', '判断', '原则'],
    reversedKeywords: ['武断', '冷酷', '以理压人'],
    upright: '以原则作判断，并对判断负责。',
    reversed: '道理讲赢了，人心却散了。',
    symbolism: '石座与直立的剑——真理若不带慈悲，便成刀锋。',
    virtue: '公义（Iustitia）'
  }
];
