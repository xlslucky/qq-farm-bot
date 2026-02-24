/**
 * 生成植物表格
 */

const plant = require('../gameConfig/Plant.json');

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${mins}分`;
  }
  return `${mins}分`;
}

const tableData = plant.map(p => {
  const phases = p.grow_phases.split(';').filter(x => x);
  let totalTime = 0;
  phases.forEach(x => {
    const parts = x.split(':');
    const val = parseInt(parts[1]) || 0;
    if (val > 0) totalTime += val;
  });

  return {
    ID: p.id,
    名称: p.name,
    种子ID: p.seed_id,
    土地等级: p.land_level_need,
    季节: p.seasons,
    果实ID: p.fruit.id,
    果实数量: p.fruit.count,
    经验: p.exp,
    生长时间: formatTime(totalTime),
    生长秒数: totalTime
  };
});

console.table(tableData);

console.log(`共 ${plant.length} 种作物`);
