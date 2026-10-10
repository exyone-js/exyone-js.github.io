/*!
 * Sortes Sacrae · 星币 (Pentacles, 土)
 *
 * 劳作、身体与受造界。与之相应的德行是忠信与勤勉。
 */
import type { CardSeed } from './types';

export const PENTACLES: readonly CardSeed[] = [
  {
    number: '一',
    name: '星币首牌',
    latin: 'Nummus Primus · Ace of Pentacles',
    keywords: ['机会', '种子', '可用的资源'],
    reversedKeywords: ['错失', '拖延', '资源误用'],
    upright: '一颗可落地的种子交到手里。务实的小步，胜过宏大的空谈。',
    reversed: '机会在手边放凉，或被用在错的地方。',
    symbolism: '园中的金币——受造之物本是好的，值得好好经营。',
    virtue: '勤勉（Diligentia）'
  },
  {
    number: '二',
    name: '星币二',
    latin: 'Duo Nummi · Two of Pentacles',
    keywords: ['平衡', '机动', '兼顾'],
    reversedKeywords: ['失衡', '分身乏术', '财务混乱'],
    upright: '在多项责任之间走绳索。节奏比蛮力重要。',
    reversed: '同时抛的球太多，已经分不清哪颗要落地。',
    symbolism: '无限符号与两枚币——真正稳定的是动态的平衡。',
    virtue: '节制（Temperantia）'
  },
  {
    number: '三',
    name: '星币三',
    latin: 'Tres Nummi · Three of Pentacles',
    keywords: ['协作', '技艺', '被认可'],
    reversedKeywords: ['配合不佳', '独断', '成果平庸'],
    upright: '各按其职，彼此成就。请善用你身边人的专长。',
    reversed: '各行其是，图纸越改越乱。',
    symbolism: '教堂中的工匠与图纸——手艺是献给共同体的礼物。',
    virtue: '勤勉（Diligentia）'
  },
  {
    number: '四',
    name: '星币四',
    latin: 'Quattuor Nummi · Four of Pentacles',
    keywords: ['保守', '积蓄', '安全感'],
    reversedKeywords: ['松手', '慷慨', '被占有欲困住'],
    upright: '守住已有的确实重要，但握得太紧，手心便空了。',
    reversed: '要么学会慷慨，要么发现是东西在占有人。',
    symbolism: '抱币而坐——安全感若成了围墙，就成了牢房。',
    virtue: '神贫（Paupertas Spiritus）'
  },
  {
    number: '五',
    name: '星币五',
    latin: 'Quinque Nummi · Five of Pentacles',
    keywords: ['匮乏', '寒冷', '被排除'],
    reversedKeywords: ['好转', '获得援助', '走出困境'],
    upright: '眼下的窘迫是真的，也请注意那扇还亮着灯的窗。',
    reversed: '有人开了门，处境正在慢慢回温。',
    symbolism: '雪中经过的彩窗——求助的门并未上锁。',
    virtue: '望德（Spes）'
  },
  {
    number: '六',
    name: '星币六',
    latin: 'Sex Nummi · Six of Pentacles',
    keywords: ['施与受', '公道', '恩惠'],
    reversedKeywords: ['附带条件的给予', '依赖', '不均'],
    upright: '有给的有收的。衡量时请记得人心，而不只是账目。',
    reversed: '施舍成了绳索，让受助者无法抬头。',
    symbolism: '天平与施舍的手——慷慨需要公义的刻度。',
    virtue: '公义（Iustitia）'
  },
  {
    number: '七',
    name: '星币七',
    latin: 'Septem Nummi · Seven of Pentacles',
    keywords: ['耐心', '评估', '长期投入'],
    reversedKeywords: ['焦躁', '投入无果', '急功近利'],
    upright: '收成需要季节。此时该做的是评估与等待，而不是拔苗。',
    reversed: '等得不耐烦，于是把还没熟的果子摘了下来。',
    symbolism: '倚锄凝望藤蔓——真正的成长无法催熟。',
    virtue: '坚忍（Constantia）'
  },
  {
    number: '八',
    name: '星币八',
    latin: 'Octo Nummi · Eight of Pentacles',
    keywords: ['精进', '重复', '手艺'],
    reversedKeywords: ['敷衍', '倦怠', '机械重复'],
    upright: '把一件小事反复做好，就是在锻造品格。',
    reversed: '手在动，心不在，做得越多越空。',
    symbolism: '一凿一凿的学徒——匠心由重复堆成。',
    virtue: '勤勉（Diligentia）'
  },
  {
    number: '九',
    name: '星币九',
    latin: 'Novem Nummi · Nine of Pentacles',
    keywords: ['自足', '品味', '劳动之果'],
    reversedKeywords: ['虚荣', '挥霍', '以拥有定义自己'],
    upright: '享用自己亲手所得的果实，并保持从容。',
    reversed: '把园子当成了身份，而不再是生活。',
    symbolism: '葡萄园中的身影——独立，但不是孤立。',
    virtue: '节制（Temperantia）'
  },
  {
    number: '十',
    name: '星币十',
    latin: 'Decem Nummi · Ten of Pentacles',
    keywords: ['传承', '家业', '长久的安稳'],
    reversedKeywords: ['家族纠葛', '短视', '只顾眼前'],
    upright: '你所建造的将留给后来的人。请为长远打算。',
    reversed: '只算这一季的账，把代价推给了下一代。',
    symbolism: '拱门下的家人与犬——产业的意义在于传承。',
    virtue: '忠信（Fidelitas）'
  },
  {
    number: '侍从',
    name: '星币侍从',
    latin: 'Famulus Nummi · Page of Pentacles',
    keywords: ['踏实学习', '具体目标'],
    reversedKeywords: ['拖延', '眼高手低', '缺乏计划'],
    upright: '把愿望写成一张可以执行的清单。',
    reversed: '计划做得很漂亮，第一步却迟迟没迈。',
    symbolism: '捧着金币凝视的少年——学习是件需要身体力行的事。',
    virtue: '勤勉（Diligentia）'
  },
  {
    number: '骑士',
    name: '星币骑士',
    latin: 'Eques Nummi · Knight of Pentacles',
    keywords: ['稳扎稳打', '可靠', '尽责'],
    reversedKeywords: ['僵化', '迟缓', '原地打转'],
    upright: '不惊艳，但从不误事。长期的可靠本身就是稀缺。',
    reversed: '谨慎变成了不敢改变。',
    symbolism: '静立的黑马与掌中之币——慢，但是不停。',
    virtue: '忠信（Fidelitas）'
  },
  {
    number: '王后',
    name: '星币王后',
    latin: 'Regina Nummi · Queen of Pentacles',
    keywords: ['务实', '照料', '丰盛'],
    reversedKeywords: ['过劳', '控制', '以照料之名掌控'],
    upright: '把日子过得安稳而有余，并让身边的人也安稳。',
    reversed: '什么都替人做了，也顺手拿走了对方的选择。',
    symbolism: '花园中的王座——照料的果实是具体可见的。',
    virtue: '慈爱（Caritas）'
  },
  {
    number: '国王',
    name: '星币国王',
    latin: 'Rex Nummi · King of Pentacles',
    keywords: ['稳固', '富足', '经营有道'],
    reversedKeywords: ['贪婪', '顽固', '以财衡量一切'],
    upright: '让资源各得其所。富足的价值，在于它能成就什么。',
    reversed: '把账本当成了良心，把人看成了成本。',
    symbolism: '藤蔓环绕的王座——丰盛是受托，而非所有。',
    virtue: '明智（Prudentia）'
  }
];
