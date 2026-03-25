// 1. CREATE GENERATOR FIRST
const generator = new Blockly.Generator('C');
generator.ORDER_ATOMIC = 0;
generator.scrub_ = function (block, code, thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  const nextCode = thisOnly || !nextBlock ? '' : generator.blockToCode(nextBlock);
  return code + nextCode;
};
let workspace;
let workspaceDirty = false;
let uploadedCFile = null;
let lastDownloadedCName = 'codiac.c';
const flashShScript = `#!/usr/bin/env bash
set -e  # Exit if any command fails

# Check input
if [ -z "$1" ]; then
  echo "Usage: $0 File.c"
  exit 1
fi

FILE="$1"
BASENAME=$(basename "$FILE" .c)

echo
echo "=============================="
echo "   STC8 Flash Automation Tool"
echo "=============================="

# Step 1: Compile
echo
echo "[1/3] Compiling $FILE with SDCC..."
sdcc "$FILE"

# Step 2: Convert IHX -> HEX
echo
echo "[2/3] Converting $BASENAME.ihx to $BASENAME.hex..."
packihx "$BASENAME.ihx" > "$BASENAME.hex"

# Step 3: Activate virtual environment
echo
echo "[3/3] Activating virtual environment..."
source /home/ashinaji/Installs/PythonVenv/venv/bin/activate

# Flash using stcgal
echo
echo "Flashing $BASENAME.hex with stcgal..."
stcgal "$BASENAME.hex"

# Deactivate virtual environment
echo
echo "Deactivating virtual environment..."
deactivate

echo
echo "Done!"
`;
const els = {
  generateBtn: document.getElementById('generateBtn'),
  verifyBtn: document.getElementById('verifyBtn'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  uploadBtn: document.getElementById('uploadBtn'),
  uploadCInput: document.getElementById('uploadCInput'),
  uploadLabel: document.getElementById('uploadLabel'),
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
  uploadFileBtn: document.getElementById('uploadFileBtn'),
  openXmlBtn: document.getElementById('openXmlBtn'),
  openXmlInput: document.getElementById('openXmlInput'),
  newWorkspaceBtn: document.getElementById('newWorkspaceBtn'),
  editMenuBtn: document.getElementById('editMenuBtn'),
  editMenu: document.getElementById('editMenu'),
  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  sampleBtn: document.getElementById('sampleBtn'),
  downloadFlashSh: document.getElementById('downloadFlashSh'),
  downloadFlashBat: document.getElementById('downloadFlashBat'),
  helpBtn: document.getElementById('helpBtn'),
  helpModal: document.getElementById('helpModal'),
  helpModalContainer: document.getElementById('helpModalContainer'),
  helpModalClose: document.getElementById('helpModalClose'),
  helpOkBtn: document.getElementById('helpOkBtn'),
  helpCopyBtn: document.getElementById('helpCopyBtn'),
  verifyModal: document.getElementById('verifyModal'),
  verifyModalContainer: document.getElementById('verifyModalContainer'),
  verifyModalClose: document.getElementById('verifyModalClose'),
  verifyOkBtn: document.getElementById('verifyOkBtn'),
  verifyCopyBtn: document.getElementById('verifyCopyBtn'),
  verifyDownloadShBtn: document.getElementById('verifyDownloadShBtn'),
  verifyDownloadCBtn: document.getElementById('verifyDownloadCBtn'),
  verifyCopyLinuxCmdBtn: document.getElementById('verifyCopyLinuxCmdBtn'),
  verifyCopyWindowsCmdBtn: document.getElementById('verifyCopyWindowsCmdBtn')
};

//Creates work Area
window.onload = function() {
  workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolboxProgram')
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
      lastDownloadedCName = 'codiac.c';
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

  if (els.uploadBtn && els.uploadCInput) {
    els.uploadBtn.addEventListener('click', function () {
      els.uploadCInput.value = '';
      els.uploadCInput.click();
    });

    els.uploadCInput.addEventListener('change', function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        uploadedCFile = {
          name: file.name,
          content: String(reader.result || '')
        };
        if (els.uploadLabel) {
          els.uploadLabel.textContent = file.name || 'C file uploaded';
        }
      };
      reader.onerror = function () {
        if (els.uploadLabel) {
          els.uploadLabel.textContent = 'Upload failed';
        }
      };
      reader.readAsText(file);
    });
  }

  initCalculator();
  initFileMenu();
  initEditMenu();
  initDownloadsMenu();
  initHelpModal();
  initBlocksTabs();
  initVerifyModal();

};

function initDownloadsMenu() {
  if (els.downloadFlashSh) {
    els.downloadFlashSh.onclick = null;
    els.downloadFlashSh.addEventListener('click', function () {
      saveWithDialog(flashShScript, 'flash.sh', [
        {
          description: 'Shell script',
          accept: { 'text/x-shellscript': ['.sh'] }
        },
        {
          description: 'Text',
          accept: { 'text/plain': ['.txt'] }
        }
      ]);

      if (els.editMenu) {
        els.editMenu.classList.remove('open');
      }
    });
  }

  if (els.downloadFlashBat) {
    els.downloadFlashBat.onclick = null;
  }
}

function initVerifyModal() {
  if (!els.verifyBtn || !els.verifyModal || !els.verifyModalContainer) {
    return;
  }

  function openVerify() {
    els.verifyModal.classList.add('active');
    els.verifyModalContainer.classList.add('active');
  }

  function closeVerify() {
    els.verifyModal.classList.remove('active');
    els.verifyModalContainer.classList.remove('active');
  }

  els.verifyBtn.addEventListener('click', openVerify);

  if (els.verifyModalClose) {
    els.verifyModalClose.addEventListener('click', closeVerify);
  }

  if (els.verifyOkBtn) {
    els.verifyOkBtn.addEventListener('click', closeVerify);
  }

  if (els.verifyCopyBtn) {
    els.verifyCopyBtn.addEventListener('click', function () {
      const steps =
        'Step 1: Download the shell script into your project folder.\n' +
        'Step 2: Download your generated C code to your project folder (Save As).\n' +
        'Step 3: Open your terminal and redirect it to your project folder.\n' +
        'Step 4.1 (Linux): bash flash.sh <c code file name.c>\n' +
        'Step 4.2 (Windows): flash.bat <c file name.c>\n' +
        'NOTE: YOU MUST ENTER THE SAVED C FILE NAME ALONG WITH EXTENSION.';
      copyTextToClipboard(steps);
    });
  }

  if (els.verifyCopyLinuxCmdBtn) {
    els.verifyCopyLinuxCmdBtn.addEventListener('click', function () {
      copyTextToClipboard('bash flash.sh <c code file name.c>');
      setTempButtonLabel(els.verifyCopyLinuxCmdBtn, 'Copied!');
    });
  }

  if (els.verifyCopyWindowsCmdBtn) {
    els.verifyCopyWindowsCmdBtn.addEventListener('click', function () {
      copyTextToClipboard('flash.bat <c code file name.c>');
      setTempButtonLabel(els.verifyCopyWindowsCmdBtn, 'Copied!');
    });
  }

  if (els.verifyDownloadShBtn) {
    els.verifyDownloadShBtn.addEventListener('click', function () {
      saveWithDialog(flashShScript, 'flash.sh', [
        {
          description: 'Shell script',
          accept: { 'text/x-shellscript': ['.sh'] }
        },
        {
          description: 'Text',
          accept: { 'text/plain': ['.txt'] }
        }
      ]);
    });
  }

  if (els.verifyDownloadCBtn) {
    els.verifyDownloadCBtn.addEventListener('click', function () {
      const code = String(els.output ? els.output.textContent : '').trim();
      if (!code || code === 'Click "Generate C Code" to see output.' || code.startsWith('Error:')) {
        alert('Generate C code first');
        return;
      }
      lastDownloadedCName = 'codiac.c';
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

  els.verifyModal.addEventListener('click', function (event) {
    if (event.target === els.verifyModal) {
      closeVerify();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && els.verifyModal.classList.contains('active')) {
      closeVerify();
    }
  });
}

function initBlocksTabs() {
  const tabs = Array.from(document.querySelectorAll('.blocks-tab'));
  if (!tabs.length || !workspace) {
    return;
  }

  let activeIndex = Math.max(0, tabs.findIndex(function (tab) {
    return tab.classList.contains('active');
  }));
  let switchLock = false;

  function getFlyoutMetrics() {
    const flyout = workspace.getFlyout && workspace.getFlyout();
    if (!flyout) {
      return null;
    }
    if (typeof flyout.getMetrics === 'function') {
      return flyout.getMetrics();
    }
    if (flyout.workspace_ && typeof flyout.workspace_.getMetrics === 'function') {
      return flyout.workspace_.getMetrics();
    }
    return null;
  }

  function setActiveCategory(index) {
    if (index < 0 || index >= tabs.length) {
      return;
    }
    const tab = tabs[index];
    tabs.forEach(function (item) { item.classList.remove('active'); });
    tab.classList.add('active');
    activeIndex = index;

    const category = tab.getAttribute('data-category');
    const toolboxId = category ? 'toolbox' + category : '';
    const toolbox = toolboxId ? document.getElementById(toolboxId) : null;
    if (toolbox) {
      workspace.updateToolbox(toolbox);
      scheduleWorkspaceResize();
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const index = tabs.indexOf(tab);
      setActiveCategory(index);
    });
  });

  const blocklyDiv = workspace.getInjectionDiv && workspace.getInjectionDiv();
  if (blocklyDiv) {
    blocklyDiv.addEventListener('wheel', function (event) {
      if (switchLock) {
        return;
      }

      const metrics = getFlyoutMetrics();
      if (!metrics) {
        return;
      }

      const viewTop = Number(metrics.viewTop) || 0;
      const viewHeight = Number(metrics.viewHeight) || 0;
      const contentHeight = Number(metrics.contentHeight) || 0;
      const atTop = viewTop <= 2;
      const atBottom = (viewTop + viewHeight) >= (contentHeight - 2);

      if (event.deltaY > 0 && atBottom && activeIndex < tabs.length - 1) {
        switchLock = true;
        event.preventDefault();
        setActiveCategory(activeIndex + 1);
        setTimeout(function () { switchLock = false; }, 180);
      } else if (event.deltaY < 0 && atTop && activeIndex > 0) {
        switchLock = true;
        event.preventDefault();
        setActiveCategory(activeIndex - 1);
        setTimeout(function () { switchLock = false; }, 180);
      }
    }, { passive: false });
  }

  setActiveCategory(activeIndex);
}

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
    if (els.editMenu) {
      els.editMenu.classList.remove('open');
    }
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
    });
  }

  if (els.uploadFileBtn && els.uploadCInput) {
    els.uploadFileBtn.addEventListener('click', function () {
      els.uploadCInput.value = '';
      els.uploadCInput.click();
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
      }
    });
  }

  if (els.openXmlBtn && els.openXmlInput) {
    els.openXmlBtn.addEventListener('click', function () {
      if (confirmDiscardIfNeeded()) {
        els.openXmlInput.value = '';
        els.openXmlInput.click();
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
    if (els.fileMenu) {
      els.fileMenu.classList.remove('open');
    }
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
    });
  }

  if (els.redoBtn) {
    els.redoBtn.addEventListener('click', function () {
      if (workspace) {
        workspace.undo(true);
      }
    });
  }

  if (els.sampleBtn) {
    els.sampleBtn.addEventListener('click', function () {
      if (confirmDiscardIfNeeded()) {
        createSampleProgram();
      }
    });
  }
}

function createSampleProgram() {
  if (!workspace || !Blockly) {
    return;
  }

  workspace.clear();

  const startBlock = workspace.newBlock('start_block');
  const includeBlock = workspace.newBlock('include_library');
  const initBlock = workspace.newBlock('initialize_8052');

  startBlock.initSvg();
  includeBlock.initSvg();
  initBlock.initSvg();

  startBlock.moveBy(40, 40);
  includeBlock.moveBy(40, 110);
  initBlock.moveBy(40, 180);

  if (startBlock.nextConnection && includeBlock.previousConnection) {
    startBlock.nextConnection.connect(includeBlock.previousConnection);
  }

  if (includeBlock.nextConnection && initBlock.previousConnection) {
    includeBlock.nextConnection.connect(initBlock.previousConnection);
  }

  startBlock.render();
  includeBlock.render();
  initBlock.render();

  workspaceDirty = true;
  scheduleWorkspaceResize();
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

function downloadStaticFile(path, filename) {
  const link = document.createElement('a');
  link.href = path;
  link.download = filename || '';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

function setTempButtonLabel(button, label) {
  if (!button) {
    return;
  }
  const original = button.textContent;
  button.textContent = label;
  setTimeout(function () {
    button.textContent = original;
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
  const portModes = {};
  const context = {
    needsResetConfig: false,
    needsMsDelay: false
  };
  const topBlocks = workspace.getTopBlocks(true);
  const allBlocks = workspace.getAllBlocks ? workspace.getAllBlocks(false) : [];

  for (let i = 0; i < allBlocks.length; i++) {
    if (allBlocks[i].type === 'timing_delay_ms') {
      context.needsMsDelay = true;
    }
  }

  for (let i = 0; i < topBlocks.length; i++) {
    collectCodeFromChain(topBlocks[i], includes, declarations, statements, portModes, context);
  }

  if (includes.size === 0) {
    includes.add('#include <8052.h>\n');
  }

  const includeSection = Array.from(includes).join('');
  const delayHelpers = context.needsMsDelay
    ? 'void msdelay(void) {\n' +
      '  TMOD = 0x01;\n' +
      '  TL0 = 0x66;\n' +
      '  TH0 = 0xFC;\n' +
      '  TR0 = 1;\n' +
      '  while (TF0 == 0);\n' +
      '  TR0 = 0;\n' +
      '  TF0 = 0;\n' +
      '}\n\n' +
      'void delay_ms(unsigned int ms) {\n' +
      '  while (ms--) {\n' +
      '    msdelay();\n' +
      '  }\n' +
      '}\n\n'
    : '';
  const declarationSection = (declarations.length ? declarations.join('') + '\n' : '') + delayHelpers;
  const modeStatements = buildPortModeStatements(portModes);
  const resetStatements = context.needsResetConfig
    ? ['//Reset configuration\n', 'RSTCFG = 0x10;\n']
    : [];
  const allStatements = modeStatements.concat(resetStatements, statements);
  const statementSection = allStatements.length ? indentCodeLines(allStatements.join('')) : '';

  return `${includeSection}
${declarationSection}void main(void) {
${statementSection}}`;
}
function collectCodeFromChain(block, includes, declarations, statements, portModes, context) {
  const declarationTypes = new Set(['initialize_8052']);
  const statementTypes = new Set([
    'assign_bit_value',
    'while_forever',
    'print_text',
    'gpio_set_high',
    'gpio_set_low',
    'gpio_toggle',
    'control_if',
    'control_if_else',
    'control_while',
    'control_for',
    'timing_delay_ms',
    'uart_init',
    'uart_send_text',
    'uart_send_variable'
  ]);
  let current = block;

  while (current) {
    const type = current.type;
    if (type === 'include_library') {
      const code = generateBlockCode(current);
      if (code) {
        includes.add(code);
      }
    } else if (/^uart_/.test(type)) {
      includes.add('#include <uart.h>\n');
      const code = generateBlockCode(current);
      if (code) {
        statements.push(code);
      }
    } else if (type === 'assign_register_hex' || type === 'gpio_set_mode') {
      const target = String(current.getFieldValue('TARGET') || '').trim();
      const mode = current.getFieldValue('MODE') === 'INPUT' ? 'INPUT' : 'OUTPUT';
      const pinInfo = parsePinTarget(target);
      if (pinInfo) {
        const portKey = pinInfo.port;
        if (!portModes[portKey]) {
          portModes[portKey] = { m0: 0, m1: 0 };
        }
        const bitMask = 1 << pinInfo.bit;
        if (mode === 'INPUT') {
          portModes[portKey].m1 |= bitMask;
        } else {
          portModes[portKey].m0 |= bitMask;
        }
      }
    } else if (declarationTypes.has(type)) {
      if (type === 'initialize_8052') {
        context.needsResetConfig = true;
      }
      const code = generateBlockCode(current);
      if (code) {
        declarations.push(code);
      }
    } else if (statementTypes.has(type)) {
      if (type === 'timing_delay_ms') {
        context.needsMsDelay = true;
      }
      const code = generateBlockCode(current);
      if (code) {
        statements.push(code);
      }
    }
    current = current.getNextBlock();
  }
}

function buildPortModeStatements(portModes) {
  const statements = [];
  const ports = Object.keys(portModes).sort();
  for (let i = 0; i < ports.length; i++) {
    const port = ports[i];
    const modes = portModes[port];
    if (!modes) {
      continue;
    }
    const m1Value = toHexByte(modes.m1 || 0);
    const m0Value = toHexByte(modes.m0 || 0);
    statements.push(port + 'M1 = ' + m1Value + ';\n');
    statements.push(port + 'M0 = ' + m0Value + ';\n');
  }
  return statements;
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

const PIN_OPTIONS = [
  ['3.2', 'P3_2'],
  ['3.3', 'P3_3'],
  ['5.4', 'P5_4'],
  ['5.5', 'P5_5']
];

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
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'TARGET')
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

Blockly.Blocks['gpio_set_mode'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('set pin mode')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'TARGET')
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

Blockly.Blocks['gpio_set_high'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('set pin HIGH')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'TARGET');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(60);
  }
};

Blockly.Blocks['gpio_set_low'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('set pin LOW')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'TARGET');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(60);
  }
};

Blockly.Blocks['gpio_toggle'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('toggle pin')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'TARGET');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(60);
  }
};

Blockly.Blocks['gpio_read'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('read pin')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'TARGET');
    this.setOutput(true, 'Boolean');
    this.setColour(80);
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

Blockly.Blocks['control_if'] = {
  init: function () {
    this.appendValueInput('COND')
      .setCheck('Boolean')
      .appendField('if');
    this.appendStatementInput('DO')
      .appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
  }
};

Blockly.Blocks['control_if_else'] = {
  init: function () {
    this.appendValueInput('COND')
      .setCheck('Boolean')
      .appendField('if');
    this.appendStatementInput('DO')
      .appendField('do');
    this.appendStatementInput('ELSE')
      .appendField('else');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
  }
};

Blockly.Blocks['control_while'] = {
  init: function () {
    this.appendValueInput('COND')
      .setCheck('Boolean')
      .appendField('while');
    this.appendStatementInput('DO')
      .appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
  }
};

Blockly.Blocks['control_for'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('for')
      .appendField(new Blockly.FieldTextInput('i = 0'), 'INIT')
      .appendField(';')
      .appendField(new Blockly.FieldTextInput('i < 10'), 'COND')
      .appendField(';')
      .appendField(new Blockly.FieldTextInput('i++'), 'STEP');
    this.appendStatementInput('DO')
      .appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
  }
};

Blockly.Blocks['timing_delay_ms'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('delay(ms)')
      .appendField(new Blockly.FieldNumber(100, 0, 1000000, 1), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(180);
  }
};

Blockly.Blocks['uart_init'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('UART init')
      .appendField(new Blockly.FieldDropdown([
        ['9600', '9600'],
        ['19200', '19200'],
        ['38400', '38400'],
        ['57600', '57600'],
        ['115200', '115200']
      ]), 'BAUD');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(290);
  }
};

Blockly.Blocks['uart_send_text'] = {
  init: function () {
    this.appendValueInput('TEXT')
      .setCheck('String')
      .appendField('UART send text');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(290);
  }
};

Blockly.Blocks['uart_send_variable'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('UART send variable')
      .appendField(new Blockly.FieldTextInput('value'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(290);
  }
};

Blockly.Blocks['uart_receive'] = {
  init: function () {
    this.appendDummyInput().appendField('UART receive');
    this.setOutput(true);
    this.setColour(290);
  }
};

Blockly.Blocks['logic_equal'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('==')
      .appendField(new Blockly.FieldNumber(0, -2147483648, 2147483647, 1), 'A')
      .appendField('==')
      .appendField(new Blockly.FieldNumber(0, -2147483648, 2147483647, 1), 'B');
    this.setOutput(true, 'Boolean');
    this.setColour(230);
  }
};

Blockly.Blocks['logic_not_equal'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('!=')
      .appendField(new Blockly.FieldNumber(0, -2147483648, 2147483647, 1), 'A')
      .appendField('!=')
      .appendField(new Blockly.FieldNumber(0, -2147483648, 2147483647, 1), 'B');
    this.setOutput(true, 'Boolean');
    this.setColour(230);
  }
};

Blockly.Blocks['logic_and'] = {
  init: function () {
    this.appendValueInput('A')
      .setCheck('Boolean')
      .appendField('AND');
    this.appendValueInput('B')
      .setCheck('Boolean')
      .appendField('and');
    this.setOutput(true, 'Boolean');
    this.setColour(230);
  }
};

Blockly.Blocks['logic_or'] = {
  init: function () {
    this.appendValueInput('A')
      .setCheck('Boolean')
      .appendField('OR');
    this.appendValueInput('B')
      .setCheck('Boolean')
      .appendField('or');
    this.setOutput(true, 'Boolean');
    this.setColour(230);
  }
};

Blockly.Blocks['logic_not'] = {
  init: function () {
    this.appendValueInput('A')
      .setCheck('Boolean')
      .appendField('NOT');
    this.setOutput(true, 'Boolean');
    this.setColour(230);
  }
};

Blockly.Blocks['bitwise_and'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('AND (&)')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'A')
      .appendField('&')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'B');
    this.setOutput(true);
    this.setColour(330);
  }
};

Blockly.Blocks['bitwise_or'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('OR (|)')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'A')
      .appendField('|')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'B');
    this.setOutput(true);
    this.setColour(330);
  }
};

Blockly.Blocks['bitwise_xor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('XOR (^)')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'A')
      .appendField('^')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'B');
    this.setOutput(true);
    this.setColour(330);
  }
};

Blockly.Blocks['bitwise_not'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('NOT (~)')
      .appendField('~')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'A');
    this.setOutput(true);
    this.setColour(330);
  }
};

Blockly.Blocks['bitwise_shift_left'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('shift left (<<)')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'A')
      .appendField('<<')
      .appendField(new Blockly.FieldNumber(1, 0, 31, 1), 'B');
    this.setOutput(true);
    this.setColour(330);
  }
};

Blockly.Blocks['bitwise_shift_right'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('shift right (>>)')
      .appendField(new Blockly.FieldNumber(0, 0, 65535, 1), 'A')
      .appendField('>>')
      .appendField(new Blockly.FieldNumber(1, 0, 31, 1), 'B');
    this.setOutput(true);
    this.setColour(330);
  }
};

Blockly.Blocks['while_forever'] = {
  init: function () {
    this.appendDummyInput().appendField('while (1)');
    this.appendStatementInput('DO')
      .appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(15);
  }
};

// Print block
Blockly.Blocks['print_text'] = {
  init: function () {
    this.appendValueInput("TEXT")
      .setCheck("String")
      .appendField("print")
      .setAlign(Blockly.ALIGN_RIGHT);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
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
    '__sfr __at (0xFF) RSTCFG;\n' +
    '//set values of output port register\n' +
    '__sbit __at (0xB2) P3_2;\n' +
    '__sbit __at (0xB3) P3_3;\n' +
    '__sbit __at (0xCC) P5_4;\n' +
    '__sbit __at (0xCD) P5_5;\n';
};

generator.forBlock['assign_register_hex'] = function(block) {
  return '';
};

generator.forBlock['gpio_set_mode'] = function(block) {
  return '';
};

generator.forBlock['gpio_set_high'] = function(block) {
  const target = sanitizeIdentifier(block.getFieldValue('TARGET'), 'TEMP_PIN');
  return target + ' = 1;\n';
};

generator.forBlock['gpio_set_low'] = function(block) {
  const target = sanitizeIdentifier(block.getFieldValue('TARGET'), 'TEMP_PIN');
  return target + ' = 0;\n';
};

generator.forBlock['gpio_toggle'] = function(block) {
  const target = sanitizeIdentifier(block.getFieldValue('TARGET'), 'TEMP_PIN');
  return target + ' = !' + target + ';\n';
};

generator.forBlock['gpio_read'] = function(block) {
  const target = sanitizeIdentifier(block.getFieldValue('TARGET'), 'TEMP_PIN');
  return [target, generator.ORDER_ATOMIC];
};

generator.forBlock['assign_bit_value'] = function(block) {
  const target = sanitizeIdentifier(block.getFieldValue('TARGET'), 'TEMP_BIT');
  const value = block.getFieldValue('VALUE') === '1' ? '1' : '0';
  return target + ' = ' + value + ';\n';
};

generator.forBlock['control_if'] = function(block) {
  const condition = generator.valueToCode(block, 'COND', generator.ORDER_ATOMIC) || '0';
  const body = generator.statementToCode(block, 'DO');
  return 'if (' + condition + ') {\n' + body + '}\n';
};

generator.forBlock['control_if_else'] = function(block) {
  const condition = generator.valueToCode(block, 'COND', generator.ORDER_ATOMIC) || '0';
  const body = generator.statementToCode(block, 'DO');
  const elseBody = generator.statementToCode(block, 'ELSE');
  return 'if (' + condition + ') {\n' + body + '} else {\n' + elseBody + '}\n';
};

generator.forBlock['control_while'] = function(block) {
  const condition = generator.valueToCode(block, 'COND', generator.ORDER_ATOMIC) || '0';
  const body = generator.statementToCode(block, 'DO');
  return 'while (' + condition + ') {\n' + body + '}\n';
};

generator.forBlock['control_for'] = function(block) {
  const init = String(block.getFieldValue('INIT') || '').trim();
  const condition = String(block.getFieldValue('COND') || '').trim() || '1';
  const step = String(block.getFieldValue('STEP') || '').trim();
  const body = generator.statementToCode(block, 'DO');
  return 'for (' + init + '; ' + condition + '; ' + step + ') {\n' + body + '}\n';
};

generator.forBlock['timing_delay_ms'] = function(block) {
  const value = Math.max(0, Number(block.getFieldValue('VALUE')) || 0);
  return 'delay_ms(' + Math.floor(value) + ');\n';
};

generator.forBlock['uart_init'] = function(block) {
  const baud = String(block.getFieldValue('BAUD') || '9600');
  return 'UART_Init(' + baud + ');\n';
};

generator.forBlock['uart_send_text'] = function(block) {
  const text = generator.valueToCode(block, 'TEXT', generator.ORDER_ATOMIC) || '""';
  return 'UART_SendText(' + text + ');\n';
};

generator.forBlock['uart_send_variable'] = function(block) {
  const name = sanitizeIdentifier(block.getFieldValue('NAME'), 'value');
  return 'UART_SendVariable(' + name + ');\n';
};

generator.forBlock['uart_receive'] = function() {
  return ['UART_Receive()', generator.ORDER_ATOMIC];
};

generator.forBlock['logic_equal'] = function(block) {
  const a = Number(block.getFieldValue('A')) || 0;
  const b = Number(block.getFieldValue('B')) || 0;
  return ['(' + a + ' == ' + b + ')', generator.ORDER_ATOMIC];
};

generator.forBlock['logic_not_equal'] = function(block) {
  const a = Number(block.getFieldValue('A')) || 0;
  const b = Number(block.getFieldValue('B')) || 0;
  return ['(' + a + ' != ' + b + ')', generator.ORDER_ATOMIC];
};

generator.forBlock['logic_and'] = function(block) {
  const a = generator.valueToCode(block, 'A', generator.ORDER_ATOMIC) || '0';
  const b = generator.valueToCode(block, 'B', generator.ORDER_ATOMIC) || '0';
  return ['((' + a + ') && (' + b + '))', generator.ORDER_ATOMIC];
};

generator.forBlock['logic_or'] = function(block) {
  const a = generator.valueToCode(block, 'A', generator.ORDER_ATOMIC) || '0';
  const b = generator.valueToCode(block, 'B', generator.ORDER_ATOMIC) || '0';
  return ['((' + a + ') || (' + b + '))', generator.ORDER_ATOMIC];
};

generator.forBlock['logic_not'] = function(block) {
  const a = generator.valueToCode(block, 'A', generator.ORDER_ATOMIC) || '0';
  return ['(!(' + a + '))', generator.ORDER_ATOMIC];
};

generator.forBlock['bitwise_and'] = function(block) {
  const a = Number(block.getFieldValue('A')) || 0;
  const b = Number(block.getFieldValue('B')) || 0;
  return ['(' + a + ' & ' + b + ')', generator.ORDER_ATOMIC];
};

generator.forBlock['bitwise_or'] = function(block) {
  const a = Number(block.getFieldValue('A')) || 0;
  const b = Number(block.getFieldValue('B')) || 0;
  return ['(' + a + ' | ' + b + ')', generator.ORDER_ATOMIC];
};

generator.forBlock['bitwise_xor'] = function(block) {
  const a = Number(block.getFieldValue('A')) || 0;
  const b = Number(block.getFieldValue('B')) || 0;
  return ['(' + a + ' ^ ' + b + ')', generator.ORDER_ATOMIC];
};

generator.forBlock['bitwise_not'] = function(block) {
  const a = Number(block.getFieldValue('A')) || 0;
  return ['(~' + a + ')', generator.ORDER_ATOMIC];
};

generator.forBlock['bitwise_shift_left'] = function(block) {
  const a = Number(block.getFieldValue('A')) || 0;
  const b = Number(block.getFieldValue('B')) || 0;
  return ['(' + a + ' << ' + b + ')', generator.ORDER_ATOMIC];
};

generator.forBlock['bitwise_shift_right'] = function(block) {
  const a = Number(block.getFieldValue('A')) || 0;
  const b = Number(block.getFieldValue('B')) || 0;
  return ['(' + a + ' >> ' + b + ')', generator.ORDER_ATOMIC];
};

generator.forBlock['while_forever'] = function(block) {
  const body = generator.statementToCode(block, 'DO');
  return 'while (1) {\n' + body + '}\n';
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
