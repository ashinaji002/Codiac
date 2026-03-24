// 1. CREATE GENERATOR FIRST
const generator = new Blockly.Generator('C');
generator.ORDER_ATOMIC = 0;
let workspace;
const els = {
  generateBtn: document.getElementById('generateBtn'),
  output: document.getElementById('output')
};

//Creates work Area
window.onload = function() {
  workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox')
  });
  window.addEventListener('resize', scheduleWorkspaceResize);

  els.generateBtn.onclick = function() {
    try {
      let fullCode = buildCProgram();

      els.output.textContent = fullCode;
    } catch (error) {
      els.output.textContent = 'Error: ' + error.message;
    }
  };

};

let resizeFrameId = null;

function scheduleWorkspaceResize() {
  if (!workspace) {
    return;
  }
  if (resizeFrameId !== null) {
    cancelAnimationFrame(resizeFrameId);
  }
  resizeFrameId = requestAnimationFrame(function () {
    Blockly.svgResize(workspace);
    resizeFrameId = null;
  });
}

function buildCProgram() {
  const includes = new Set();
  const declarations = [];
  const statements = [];
  const topBlocks = workspace.getTopBlocks(true);

  for (let i = 0; i < topBlocks.length; i++) {
    collectCodeFromChain(topBlocks[i], includes, declarations, statements);
  }

  if (includes.size === 0) {
    includes.add('#include <8052.h>\n');
  }

  const includeSection = Array.from(includes).join('');
  const declarationSection = declarations.length ? declarations.join('') + '\n' : '';
  const statementSection = statements.length ? indentCodeLines(statements.join('')) : '';

  return `${includeSection}
${declarationSection}void main(void) {
${statementSection}}`;
}