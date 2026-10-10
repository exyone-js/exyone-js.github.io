/*!
 * Sortes Sacrae · 权杖 (Wands, 火)
 *
 * 行动、志业、创造的驱动力。与之相应的德行是热忱与勇毅。
 */
import type { CardSeed } from './types';

export const WANDS: readonly CardSeed[] = [
  {
    number: '一',
    name: '权杖首牌',
    latin: 'Virga Prima · Ace of Wands',
    keywords: ['开端', '灵感', '召叫'],
    reversedKeywords: ['迟滞', '热情消退', '错失时机'],
    upright: '一簇火苗被点燃。有股新的驱动力正在召你起身去做。',
    reversed: '火还在，只是被压住了；动力不足，或迟迟没有动身。',
    symbolism: '云中伸出的手握着燃枝——召叫先于能力。',
    virtue: '热忱（Zelus）'
  },
  {
    number: '二',
    name: '权杖二',
    latin: 'Duae Virgae · Two of Wands',
    keywords: ['规划', '抉择', '格局'],
    reversedKeywords: ['犹豫', '格局受限', '畏惧更大的可能'],
    upright: '手握地球仪眺望远方。该为刚萌芽的愿景定下路线了。',
    reversed: '停在墙内反复权衡，害怕把可能变成承诺。',
    symbolism: '城墙上的远眺——先有异象，才有行动。',
    virtue: '明智（Prudentia）'
  },
  {
    number: '三',
    name: '权杖三',
    latin: 'Tres Virgae · Three of Wands',
    keywords: ['扩展', '等待回音', '合作'],
    reversedKeywords: ['延误', '期待落空', '孤军奋战'],
    upright: '船只已经启航，回报仍在途中。持续投入，并学会放手等待。',
    reversed: '迟迟等不到回音，或因不愿与人合作而进展有限。',
    symbolism: '崖上的背影与海上的船——付出之后，交由时间去成全。',
    virtue: '望德（Spes）'
  },
  {
    number: '四',
    name: '权杖四',
    latin: 'Quattuor Virgae · Four of Wands',
    keywords: ['庆祝', '安顿', '里程碑'],
    reversedKeywords: ['根基不稳', '家庭失和', '过度松懈'],
    upright: '因一段努力告成而欢喜。允许自己停下来，欣赏成果。',
    reversed: '庆祝之下藏着裂缝，或在安逸里忘了还要继续走。',
    symbolism: '花环与四柱——安歇本就是耕种的一部分。',
    virtue: '感恩（Gratia）'
  },
  {
    number: '五',
    name: '权杖五',
    latin: 'Quinque Virgae · Five of Wands',
    keywords: ['竞争', '摩擦', '练习'],
    reversedKeywords: ['内耗', '回避冲突', '各自为政'],
    upright: '摩擦不是失败，而是把技艺磨利的砂石。',
    reversed: '把力气花在彼此的消耗上，或一味回避必要的较量。',
    symbolism: '舞杖的五人——竞争教会我们彼此看齐。',
    virtue: '勇毅（Fortitudo）'
  },
  {
    number: '六',
    name: '权杖六',
    latin: 'Sex Virgae · Six of Wands',
    keywords: ['得胜', '认可', '凯旋'],
    reversedKeywords: ['自负', '名不副实', '害怕失败'],
    upright: '努力得到公开的肯定。接受掌声，然后把功劳归于该归的人。',
    reversed: '被掌声绑住，或为了维持形象而不敢再冒险。',
    symbolism: '桂冠与马背——荣耀是借来的，随时可以归还。',
    virtue: '谦卑（Humilitas）'
  },
  {
    number: '七',
    name: '权杖七',
    latin: 'Septem Virgae · Seven of Wands',
    keywords: ['守位', '坚持', '以一敌众'],
    reversedKeywords: ['疲于应付', '退让', '防线失守'],
    upright: '站上高地守住立场。此时的坚持，本身就是答案。',
    reversed: '疲于不断辩护，开始怀疑是否真的值得。',
    symbolism: '高地之上的独守——为所信的事争辩。',
    virtue: '坚忍（Constantia）'
  },
  {
    number: '八',
    name: '权杖八',
    latin: 'Octo Virgae · Eight of Wands',
    keywords: ['迅速', '讯息', '进展'],
    reversedKeywords: ['仓促', '误会', '事事拖延'],
    upright: '消息飞驰，事情开始加速。保持敏捷，但不失准头。',
    reversed: '节奏被打乱，讯息在传递中走了样。',
    symbolism: '空中划过的八枝——事情终于流动起来。',
    virtue: '勤勉（Diligentia）'
  },
  {
    number: '九',
    name: '权杖九',
    latin: 'Novem Virgae · Nine of Wands',
    keywords: ['坚守', '警觉', '临近终点'],
    reversedKeywords: ['疲惫', '猜疑', '防备过当'],
    upright: '最后一段路最耗人。身上带着伤仍不肯退，但也请留一分余力。',
    reversed: '警惕成了习惯，连善意也要先设防。',
    symbolism: '缠布的头与成栅的九杖——警惕是美德，也可能是枷锁。',
    virtue: '坚忍（Constantia）'
  },
  {
    number: '十',
    name: '权杖十',
    latin: 'Decem Virgae · Ten of Wands',
    keywords: ['重担', '责任', '承当'],
    reversedKeywords: ['卸不下的压力', '拒绝求助', '过劳'],
    upright: '担子确实沉重，但它也证明你被托付。学会分担，而不是硬扛。',
    reversed: '一个人背了本该由众人分担的重量。',
    symbolism: '抱满十杖前行——责任与疲惫是一体两面。',
    virtue: '忠信（Fidelitas）'
  },
  {
    number: '侍从',
    name: '权杖侍从',
    latin: 'Famulus Virgae · Page of Wands',
    keywords: ['好奇', '热忱', '初学'],
    reversedKeywords: ['三分钟热度', '虚张声势', '缺乏耐心'],
    upright: '带着好奇心去尝试。不必完美，先要开始。',
    reversed: '热情来得快去得也快，宣传大于实力。',
    symbolism: '旷野中端详燃枝的少年——热情需要被耐心引导。',
    virtue: '虚心（Humilitas）'
  },
  {
    number: '骑士',
    name: '权杖骑士',
    latin: 'Eques Virgae · Knight of Wands',
    keywords: ['冲劲', '冒险', '义无反顾'],
    reversedKeywords: ['鲁莽', '反复', '有始无终'],
    upright: '想到就出发的魄力，适合用来打破僵局。',
    reversed: '速度掩盖了方向，起步快，收尾难。',
    symbolism: '跃起的马与飘扬的火焰——速度是天赋，也是考验。',
    virtue: '勇毅（Fortitudo）'
  },
  {
    number: '王后',
    name: '权杖王后',
    latin: 'Regina Virgae · Queen of Wands',
    keywords: ['温暖', '自信', '感染力'],
    reversedKeywords: ['嫉妒', '掌控', '情绪外溢'],
    upright: '以热诚鼓舞他人。你的稳当，让别人敢靠近。',
    reversed: '以强势掩饰不安，让身边人不敢说不。',
    symbolism: '王座上的向日葵——光热由内而外。',
    virtue: '慈爱（Caritas）'
  },
  {
    number: '国王',
    name: '权杖国王',
    latin: 'Rex Virgae · King of Wands',
    keywords: ['远见', '领导', '开创'],
    reversedKeywords: ['专断', '好大喜功', '目光短浅'],
    upright: '以愿景带动众人，并为自己的决定负责。',
    reversed: '要求众人追随，却不愿听见不同的声音。',
    symbolism: '王座上的火纹——领导是替众人挨火。',
    virtue: '明智（Prudentia）'
  }
];
