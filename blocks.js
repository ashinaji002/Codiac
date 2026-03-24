// 1. CREATE GENERATOR FIRST
const generator = new Blockly.Generator('C');
generator.ORDER_ATOMIC = 0;
let workspace;
let workspaceDirty = false;
const els = {
  generateBtn: document.getElementById('generateBtn'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  output: document.getElementById('output'),
  calcCircleBtn: document.getElementById('calcCircleBtn'),
  calcModal: document.getElementById('calcModal'),
  calcModalContainer: document.querySelector('.modal-container'),
  calcModalClose: document.getElementById('calcModalClose'),
  calcBtn: document.getElementById('calcBtn'),
  hexA: document.getElementById('hexA'),
  hexB: document.getElementById('hexB'),
  hexOp: document.getElementById('hexOp'),
  calcResult: document.getElementById('calcResult'),
  numpadButtons: document.querySelectorAll('.numpad-btn'),
  fileMenuBtn: document.getElementById('fileMenuBtn'),
  fileMenu: document.getElementById('fileMenu'),
  saveCBtn: document.getElementById('saveCBtn'),
  openXmlBtn: document.getElementById('openXmlBtn'),
  openXmlInput: document.getElementById('openXmlInput'),
  newWorkspaceBtn: document.getElementById('newWorkspaceBtn'),
  editMenuBtn: document.getElementById('editMenuBtn'),
  editMenu: document.getElementById('editMenu'),
  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  helpBtn: document.getElementById('helpBtn'),
  helpModal: document.getElementById('helpModal'),
  helpModalContainer: document.getElementById('helpModalContainer'),
  helpModalClose: document.getElementById('helpModalClose'),
  helpOkBtn: document.getElementById('helpOkBtn'),
  helpCopyBtn: document.getElementById('helpCopyBtn'),
  toolboxSplitter: document.getElementById('toolboxSplitter')
};

//Creates work Area
window.onload = function() {
  workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox')
  });
  workspace.addChangeListener(function (event) {
    if (!event || event.isUiEvent) {
      return;
    }
    workspaceDirty = true;
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

  els.copyBtn.onclick = async function () {
    const code = String(els.output.textContent || '').trim();
    if (!code || code === 'Click "Generate C Code" to see output.') {
      setCopyButtonLabel('Generate First');
      return;
    }

    const copied = await copyTextToClipboard(code);
    setCopyButtonLabel(copied ? 'Copied!' : 'Copy Failed');
  };

  if (els.downloadBtn) {
    els.downloadBtn.addEventListener('click', function () {
      const code = String(els.output.textContent || '').trim();
      if (!code || code === 'Click "Generate C Code" to see output.' || code.startsWith('Error:')) {
        alert('Enter code first');
        return;
      }
      saveWithDialog(code, 'codiac.c', [
        {
          description: 'C source',
          accept: { 'text/x-csrc': ['.c'] }
        },
        {
          description: 'Text',
          accept: { 'text/plain': ['.txt'] }
        }
      ]);
    });
  }

  initCalculator();
  initFileMenu();
  initEditMenu();
  initHelpModal();
  initToolboxResizer();

};

function initFileMenu() {
  if (!els.fileMenuBtn || !els.fileMenu) {
    return;
  }

  function toggleMenu() {
    els.fileMenu.classList.toggle('open');
  }

  function closeMenu() {
    els.fileMenu.classList.remove('open');
  }

  els.fileMenuBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    toggleMenu();
  });

  document.addEventListener('click', function (event) {
    if (!els.fileMenu.contains(event.target) && event.target !== els.fileMenuBtn) {
      closeMenu();
    }
  });

  if (els.saveCBtn) {
    els.saveCBtn.addEventListener('click', function () {
      saveWorkspaceXml('codiac-workspace.xml');
      closeMenu();
    });
  }

  if (els.newWorkspaceBtn) {
    els.newWorkspaceBtn.addEventListener('click', function () {
      if (confirmDiscardIfNeeded()) {
        if (workspace) {
          workspace.clear();
        }
        if (els.output) {
          els.output.textContent = 'Click "Generate C Code" to see output.';
        }
        workspaceDirty = false;
        closeMenu();
      }
    });
  }

  if (els.openXmlBtn && els.openXmlInput) {
    els.openXmlBtn.addEventListener('click', function () {
      if (confirmDiscardIfNeeded()) {
        els.openXmlInput.value = '';
        els.openXmlInput.click();
        closeMenu();
      }
    });

    els.openXmlInput.addEventListener('change', function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      loadWorkspaceXml(file);
    });
  }
}

function initToolboxResizer() {
  if (!els.toolboxSplitter || !workspace) {
    return;
  }

  let isDragging = false;

  function applyWidth(width) {
    const toolboxDiv = document.querySelector('.blocklyToolboxDiv');
    if (!toolboxDiv) {
      return;
    }
    toolboxDiv.style.width = width + 'px';
    els.toolboxSplitter.style.left = width + 'px';
    scheduleWorkspaceResize();
  }

  function onPointerMove(event) {
    if (!isDragging) {
      return;
    }
    const rect = workspace.getInjectionDiv().getBoundingClientRect();
    const pointerX = event.clientX || (event.touches && event.touches[0].clientX);
    if (!pointerX) {
      return;
    }
    const minWidth = 160;
    const maxWidth = Math.min(420, rect.width - 200);
    let width = pointerX - rect.left;
    if (width < minWidth) {
      width = minWidth;
    }
    if (width > maxWidth) {
      width = maxWidth;
    }
    applyWidth(width);
    try {
      localStorage.setItem('codiacToolboxWidth', String(width));
    } catch (error) {
      // Ignore storage errors
    }
  }

  function stopDragging() {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', stopDragging);
  }

  els.toolboxSplitter.addEventListener('pointerdown', function (event) {
    event.preventDefault();
    isDragging = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDragging);
  });

  els.toolboxSplitter.addEventListener('touchstart', function (event) {
    event.preventDefault();
    isDragging = true;
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', stopDragging);
  }, { passive: false });

  try {
    const saved = Number(localStorage.getItem('codiacToolboxWidth'));
    if (saved && !Number.isNaN(saved)) {
      applyWidth(saved);
    }
  } catch (error) {
    // Ignore storage errors
  }
}

function initHelpModal() {
  if (!els.helpBtn || !els.helpModal || !els.helpModalContainer) {
    return;
  }

  function openHelp() {
    els.helpModal.classList.add('active');
    els.helpModalContainer.classList.add('active');
  }

  function closeHelp() {
    els.helpModal.classList.remove('active');
    els.helpModalContainer.classList.remove('active');
  }

  els.helpBtn.addEventListener('click', openHelp);

  if (els.helpModalClose) {
    els.helpModalClose.addEventListener('click', closeHelp);
  }

  if (els.helpOkBtn) {
    els.helpOkBtn.addEventListener('click', closeHelp);
  }

  if (els.helpCopyBtn) {
    els.helpCopyBtn.addEventListener('click', function () {
      const text = 'Microprocessor Programming IDE\nVersion: 1.1.1\nCopyright @codiac';
      copyTextToClipboard(text);
    });
  }

  els.helpModal.addEventListener('click', function (event) {
    if (event.target === els.helpModal) {
      closeHelp();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && els.helpModal.classList.contains('active')) {
      closeHelp();
    }
  });
}

function initEditMenu() {
  if (!els.editMenuBtn || !els.editMenu) {
    return;
  }

  function toggleMenu() {
    els.editMenu.classList.toggle('open');
  }

  function closeMenu() {
    els.editMenu.classList.remove('open');
  }

  els.editMenuBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    toggleMenu();
  });

  document.addEventListener('click', function (event) {
    if (!els.editMenu.contains(event.target) && event.target !== els.editMenuBtn) {
      closeMenu();
    }
  });

  if (els.undoBtn) {
    els.undoBtn.addEventListener('click', function () {
      if (workspace) {
        workspace.undo(false);
      }
      closeMenu();
    });
  }

  if (els.redoBtn) {
    els.redoBtn.addEventListener('click', function () {
      if (workspace) {
        workspace.undo(true);
      }
      closeMenu();
    });
  }
}

function saveGeneratedCode(filename) {
  const code = getOrBuildGeneratedCode();
  if (!code) {
    return;
  }
  saveWithDialog(code, filename);
}

function saveWorkspaceXml(filename) {
  if (!workspace || !Blockly || !Blockly.Xml) {
    return;
  }
  const xmlDom = Blockly.Xml.workspaceToDom(workspace);
  const xmlText = Blockly.Xml.domToPrettyText(xmlDom);
  saveWithDialog(xmlText, filename, [
    {
      description: 'Blockly XML',
      accept: { 'text/xml': ['.xml'] }
    }
  ]);
  workspaceDirty = false;
}

function loadWorkspaceXml(file) {
  if (!workspace || !Blockly || !Blockly.Xml) {
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const xmlText = String(reader.result || '');
      let xmlDom = Blockly.Xml.textToDom
        ? Blockly.Xml.textToDom(xmlText)
        : new DOMParser().parseFromString(xmlText, 'text/xml');
      if (xmlDom && xmlDom.documentElement) {
        xmlDom = xmlDom.documentElement;
      }
      workspace.clear();
      Blockly.Xml.domToWorkspace(xmlDom, workspace);
      workspaceDirty = false;
    } catch (error) {
      if (els.output) {
        els.output.textContent = 'Error: Unable to load workspace XML.';
      }
    }
  };
  reader.readAsText(file);
}

function confirmDiscardIfNeeded() {
  if (!workspaceDirty) {
    return true;
  }
  return confirm('You have unsaved changes. Discard them?');
}

function getOrBuildGeneratedCode() {
  const current = String(els.output ? els.output.textContent : '').trim();
  if (current && current !== 'Click "Generate C Code" to see output.') {
    return current;
  }

  try {
    const generated = buildCProgram();
    if (els.output) {
      els.output.textContent = generated;
    }
    return generated;
  } catch (error) {
    if (els.output) {
      els.output.textContent = 'Error: ' + error.message;
    }
    return '';
  }
}

function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function saveWithDialog(content, filename, types) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: types || [
          {
            description: 'C source',
            accept: { 'text/x-csrc': ['.c'] }
          },
          {
            description: 'Text',
            accept: { 'text/plain': ['.txt'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (error) {
      return;
    }
  }

  triggerDownload(content, filename);
}

function initCalculator() {
  if (!els.calcCircleBtn || !els.calcModal || !els.calcModalContainer) {
    return;
  }

  let activeHexInput = els.hexA;

  function openCalculator() {
    els.calcModal.classList.add('active');
    els.calcModalContainer.classList.add('active');
  }

  function closeCalculator() {
    els.calcModal.classList.remove('active');
    els.calcModalContainer.classList.remove('active');
  }

  if (els.hexA) {
    els.hexA.addEventListener('focus', function () { activeHexInput = els.hexA; });
  }
  if (els.hexB) {
    els.hexB.addEventListener('focus', function () { activeHexInput = els.hexB; });
  }

  els.calcCircleBtn.addEventListener('click', openCalculator);

  if (els.calcModalClose) {
    els.calcModalClose.addEventListener('click', closeCalculator);
  }

  els.calcModal.addEventListener('click', function (event) {
    if (event.target === els.calcModal) {
      closeCalculator();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && els.calcModal.classList.contains('active')) {
      closeCalculator();
    }
  });

  if (els.calcBtn) {
    els.calcBtn.addEventListener('click', runHexCalculation);
  }

  if (els.numpadButtons && els.numpadButtons.length) {
    els.numpadButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!activeHexInput) {
          return;
        }

        const action = btn.getAttribute('data-action');
        const value = btn.getAttribute('data-value');

        if (action === 'backspace') {
          activeHexInput.value = activeHexInput.value.slice(0, -1);
          return;
        }

        if (action === 'clear') {
          activeHexInput.value = '';
          return;
        }

        if (value) {
          activeHexInput.value += value;
        }
      });
    });
  }
}

function runHexCalculation() {
  if (!els.hexA || !els.hexB || !els.hexOp || !els.calcResult) {
    return;
  }

  const a = parseHexInput(els.hexA.value);
  const b = parseHexInput(els.hexB.value);

  if (a === null || b === null) {
    els.calcResult.textContent = 'Result: Invalid hex input';
    return;
  }

  const result = els.hexOp.value === 'AND' ? (a & b) : (a | b);
  const operator = els.hexOp.value === 'AND' ? '&' : '|';

  els.calcResult.textContent =
    'Result: 0x' + formatHex(result) + '\n' +
    '0x' + formatHex(a) + ' ' + operator + ' 0x' + formatHex(b) + ' = 0x' + formatHex(result);
}

function parseHexInput(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/^0x/i, '')
    .replace(/[^0-9a-fA-F]/g, '');

  if (!cleaned) {
    return null;
  }

  const parsed = parseInt(cleaned, 16);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatHex(value) {
  return Number(value >>> 0).toString(16).toUpperCase();
}

let copyLabelTimer = null;

function setCopyButtonLabel(label) {
  if (!els.copyBtn) {
    return;
  }
  els.copyBtn.textContent = label;
  if (copyLabelTimer !== null) {
    clearTimeout(copyLabelTimer);
  }
  copyLabelTimer = setTimeout(function () {
    els.copyBtn.textContent = 'Copy Code';
    copyLabelTimer = null;
  }, 1200);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (error) {
    success = false;
  }

  document.body.removeChild(textArea);
  return success;
}

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
      .appendField('set pin')
      .appendField(new Blockly.FieldDropdown([
        ['3.2', 'P3_2'],
        ['3.3', 'P3_3'],
        ['5.4', 'P5_4'],
        ['5.5', 'P5_5']
      ]), 'TARGET')
      .appendField('=')
      .appendField(new Blockly.FieldDropdown([
        ['output', 'OUTPUT'],
        ['input', 'INPUT']
      ]), 'MODE');
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
    '__sbit __at (0xB2) P3_2;\n' +
    '__sbit __at (0xB3) P3_3;\n' +
    '__sbit __at (0xCC) P5_4;\n' +
    '__sbit __at (0xCD) P5_5;\n';
};

generator.forBlock['assign_register_hex'] = function(block) {
  const target = String(block.getFieldValue('TARGET') || '').trim();
  const mode = block.getFieldValue('MODE') === 'INPUT' ? 'INPUT' : 'OUTPUT';
  const pinInfo = parsePinTarget(target);
  if (!pinInfo) {
    return '';
  }

  const maskHex = toHexByte(1 << pinInfo.bit);
  const zeroHex = '0x00';
  const m1Value = mode === 'INPUT' ? maskHex : zeroHex;
  const m0Value = mode === 'OUTPUT' ? maskHex : zeroHex;

  return pinInfo.port + 'M1 = ' + pinInfo.port + 'M1 | ' + m1Value + ';\n' +
    pinInfo.port + 'M0 = ' + pinInfo.port + 'M0 | ' + m0Value + ';\n';
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

function parsePinTarget(target) {
  const match = /^P(\d)_([0-7])$/.exec(String(target || '').trim());
  if (!match) {
    return null;
  }
  return {
    port: 'P' + match[1],
    bit: Number(match[2])
  };
}

function toHexByte(value) {
  const normalized = (Number(value) >>> 0) & 0xff;
  return '0x' + normalized.toString(16).toUpperCase().padStart(2, '0');
}
