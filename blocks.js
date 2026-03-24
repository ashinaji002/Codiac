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
function collectCodeFromChain(block, includes, declarations, statements) {
  const declarationTypes = new Set(['initialize_8052']);
  const statementTypes = new Set(['assign_register_hex', 'assign_bit_value', 'while_forever', 'print_text']);
  let current = block;

  while (current) {
    const type = current.type;
    if (type === 'include_library') {
      const code = generateBlockCode(current);
      if (code) {
        includes.add(code);
      }
    } else if (declarationTypes.has(type)) {
      const code = generateBlockCode(current);
      if (code) {
        declarations.push(code);
      }
    } else if (statementTypes.has(type)) {
      const code = generateBlockCode(current);
      if (code) {
        statements.push(code);
      }
    }
    current = current.getNextBlock();
  }
}

function generateBlockCode(block) {
  const blockGenerator = generator.forBlock[block.type];
  if (typeof blockGenerator !== 'function') {
    return '';
  }
  const result = blockGenerator(block, generator);
  return Array.isArray(result) ? result[0] : result;
}

function indentCodeLines(code) {
  const lines = String(code)
    .split('\n')
    .filter(function (line, index, arr) {
      return !(index === arr.length - 1 && line === '');
    });
  return lines.map(function (line) { return line ? '    ' + line : ''; }).join('\n') + '\n';
}

// Include block
Blockly.Blocks['start_block'] = {
  init: function () {
    this.appendDummyInput().appendField('Start');
    this.setNextStatement(true);
    this.setColour(120);
    this.setDeletable(true);
    this.setMovable(true);
  }
};

// Include block
Blockly.Blocks['include_library'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('include')
      .appendField(new Blockly.FieldDropdown([
        ['8052.h', '8052.h']
      ]), 'LIB');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(250);
  }
};

Blockly.Blocks['initialize_8052'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('Initialize 8052 Ports');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
  }
};

Blockly.Blocks['assign_register_hex'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('set')
      .appendField(new Blockly.FieldTextInput('P3M0'), 'TARGET')
      .appendField('=')
      .appendField(new Blockly.FieldTextInput('0x0C'), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(40);
  }
};

Blockly.Blocks['assign_bit_value'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('set bit')
      .appendField(new Blockly.FieldTextInput('P3_2'), 'TARGET')
      .appendField('=')
      .appendField(new Blockly.FieldDropdown([
        ['0', '0'],
        ['1', '1']
      ]), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(65);
  }
};

Blockly.Blocks['while_forever'] = {
  init: function () {
    this.appendDummyInput().appendField('while(1);');
    this.setPreviousStatement(true);
    this.setColour(15);
  }
};

// Print block
Blockly.Blocks['print_text'] = {
  init: function () {
    this.appendValueInput("TEXT")
      .setCheck("String")
      .appendField("print");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(160);
  }
};

// Text input block
Blockly.Blocks['text_input'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('text')
      .appendField(new Blockly.FieldTextInput('Hello World'), 'TEXT');
    this.setOutput(true, "String");
    this.setColour(20);
  }
};

// GENERATOR LOGIC
generator.forBlock['start_block'] = function() {
  return '';
};

generator.forBlock['include_library'] = function(block) {
  const lib = block.getFieldValue('LIB') || '8052.h';
  return '#include <' + lib + '>\n';
};

generator.forBlock['initialize_8052'] = function() {
  return '//define pinmode sfr of port 3\n' +
    '__sfr __at (0xB1) P3M1;\n' +
    '__sfr __at (0xB2) P3M0;\n' +
    '//define pinmode sfr of port 5\n' +
    '__sfr __at (0xCA) P5M0;\n' +
    '__sfr __at (0xC9) P5M1;\n' +
    '//set values of output port register\n' +
    '__sbit __at (0xCC) P5_4;\n' +
    '__sbit __at (0xCD) P5_5;\n';
};

generator.forBlock['assign_register_hex'] = function(block) {
  const target = sanitizeIdentifier(block.getFieldValue('TARGET'), 'TEMP_REG');
  const value = normalizeHexValue(block.getFieldValue('VALUE'), '0x00');
  return target + ' = ' + value + ';\n';
};

generator.forBlock['assign_bit_value'] = function(block) {
  const target = sanitizeIdentifier(block.getFieldValue('TARGET'), 'TEMP_BIT');
  const value = block.getFieldValue('VALUE') === '1' ? '1' : '0';
  return target + ' = ' + value + ';\n';
};

generator.forBlock['while_forever'] = function() {
  return 'while(1);\n';
};

generator.forBlock['print_text'] = function(block) {
  let value = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '"Hello"';
  return 'printf("%s\\n", ' + value + ');\n';
};

generator.forBlock['text_input'] = function(block) {
  const text = escapeForCString(block.getFieldValue('TEXT'));
  return ['"' + text + '"', generator.ORDER_ATOMIC];
};

function escapeForCString(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function sanitizeIdentifier(name, fallback) {
  const cleaned = String(name || '').trim().replace(/[^A-Za-z0-9_]/g, '');
  if (!cleaned) {
    return fallback;
  }
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : '_' + cleaned;
}

function normalizeHexValue(value, fallback) {
  const raw = String(value || '').trim();
  if (/^0x[0-9a-fA-F]+$/.test(raw)) {
    return raw;
  }
  if (/^[0-9a-fA-F]+$/.test(raw)) {
    return '0x' + raw.toUpperCase();
  }
  if (/^[0-9]+$/.test(raw)) {
    return raw;
  }
  return fallback;
}
