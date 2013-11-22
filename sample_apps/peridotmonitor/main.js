//////////////////////////////////////////////////
//  �p�l���̏����� 
//////////////////////////////////////////////////

var testps = new Physicaloid();		// Physicaloid�I�u�W�F�N�g�𐶐� 

// �J�n���ɌĂяo����� 
var select = null;

window.onload = function() {

	// Chrome Package Apps ��O��Ƃ���̂�FileAPI�̃`�F�b�N�͏ȗ� //

    select = document.getElementById('ports');

	// �V���A���|�[�g�̎擾 
	var scanport = function() {
		chrome.serial.getPorts(function (ports) {
			// �G�������g��S�č폜 
			while(select.firstChild){
				select.removeChild(select.firstChild);
			}

			// �X�L�������ʂ�ǉ� 
			for (var i=0; i<ports.length; i++) {
				var port = ports[i];
				select.appendChild(new Option(port, port));
			}

			// �I���ł���|�[�g�����邩 
			if (select.firstChild) {
				document.getElementById('connect').disabled = false;
			} else {
				document.getElementById('connect').disabled = true;
			}
		});
	}

	document.getElementById('connect').addEventListener('click', connectPort);
	document.getElementById('scanport').addEventListener('click', scanport);

	document.getElementById('rbffiles').addEventListener('change', handleFileSelect, false);
	document.getElementById('config').addEventListener('click', configSetup);

	document.getElementById('avm_iord').addEventListener('click', readqsysio);
	document.getElementById('avm_iowr').addEventListener('click', writeqsysio);
	document.getElementById('avm_read').addEventListener('click', memdump);
	document.getElementById('avm_write').addEventListener('click', memwrite);

	scanport();
}


// �V���A���|�[�g�̐ڑ��Ɛؒf 
var onConnect = false;

function connectPort () {
	if (!onConnect) {
		var selectedPort = select.childNodes[select.selectedIndex].value;
		document.getElementById('waitingicon').src="img/loading02_r2_c4.gif";

		testps.open(selectedPort, function (result) {
			if (result) {
				onConnect = true;
				select.disabled = true;
				document.getElementById('connect').value="Disconnect";
				document.getElementById('scanport').disabled = true;
				if (confdata != null) document.getElementById('config').disabled = false;

				document.getElementById('waitingicon').src="img/icon_ok_24x24.png";
			} else {
				document.getElementById('waitingicon').src="img/close03-001-24.png";
			}
		});
	} else {
		testps.close(function (result) {
			select.disabled = false;

			document.getElementById('connect').value="Connect";
			document.getElementById('scanport').disabled = false;
			document.getElementById('waitingicon').src="img/dummy_1x1.png";

			document.getElementById('config').disabled = true;
			document.getElementById('configicon').src="img/dummy_1x1.png";
			document.getElementById('sysid').innerHTML = "";

			onConnect = false;
	    });
	}
}


// RBF�t�@�C���̓ǂݍ��� 
var confdata = null;		// �ǂݍ���RBF�f�[�^ 

function handleFileSelect(evt) {
	var rbf = evt.target.files[0];

	if (rbf == null) {
		console.log("config : [!] rbf file not selected.");
		confdata = null;
		document.getElementById('config').disabled = true;		// �R���t�B�O���[�V�����{�^���𖳌��� 
		return;
	}

	var rbfreader = new FileReader();
	rbfreader.onload = function(e) {
		confdata = e.target.result;
		console.log("config : rbffile = " + rbf.name + ", " + e.loaded + "bytes loaded.");

		// �R���t�B�O���[�V�����{�^����L���� 
		if (onConnect) document.getElementById('config').disabled = false;
	}

	rbfreader.readAsArrayBuffer(rbf);		// �t�@�C���̓ǂݍ��݂��J�n 
}


// FPGA�̃R���t�B�O���[�V���� 
function configSetup() {

	// SysID��\�� 
	var getsysid = function(result) {
		var sysid_addr = 0x10000000 >>> 0;
		var sysid_str = "SYSID :";

		if (!result) {
			document.getElementById('sysid').innerHTML = sysid_str;
			return;
		}

		testps.avm.iord(sysid_addr, 0, function(result, iddata) {
			if (result) {
				sysid_str = sysid_str + " 0x" + ("00000000" + iddata.toString(16)).slice(-8);

				testps.avm.iord(sysid_addr, 1, function(result, tmdata) {
					sysid_str = sysid_str + ", 0x" + ("00000000" + tmdata.toString(16)).slice(-8);
					document.getElementById('sysid').innerHTML = sysid_str;
				});
			}
		});
	};

	document.getElementById('configicon').src="img/loading02_r2_c4.gif";

	testps.upload(0, confdata, function (result) {
		if (result) {
			document.getElementById('configicon').src="img/icon_ok_24x24.png";
			getsysid(true);
		} else {
			document.getElementById('configicon').src="img/close03-001-24.png";
			getsysid(false);
		}
	});
}


// Qsys�y���t�F�����̓ǂݏo�� 
function readqsysio() {
	var address = (parseInt(document.getElementById('avm_address').value, 16))>>>0;

	if (onConnect && address != NaN) {
		testps.avm.iord(address, 0, function(result, readdata) {
			if (result) {
				document.getElementById('avm_data').value = ("00000000"+readdata.toString(16)).slice(-8);
			}
		});
	}
}

// Qsys�y���t�F�����̏������� 
function writeqsysio() {
	var address = (parseInt(document.getElementById('avm_address').value, 16))>>>0;
	var data = (parseInt(document.getElementById('avm_data').value, 16))>>>0;

	if (onConnect &&(address != NaN && data != NaN)) {
		testps.avm.iowr(address, 0, data, function(result) {
		});
	}
}

// �������_���v 
function memdump() {
	var address = (parseInt(document.getElementById('mem_address').value, 16))>>>0;

	var textdump = function(readdata) {
		var readdata_arr = new Uint8Array(readdata);
		var memaddr = address;
		var str = " address   +0 +1 +2 +3 +4 +5 +6 +7 +8 +9 +a +b +c +d +e +f  sum\n" + 
				  "----------------------------------------------------------------\n";

		for(var i=0 ; i<16 ; i++) {
			var sum = 0;
			str += (("00000000"+memaddr.toString(16)).slice(-8) + " :");
			for(var j=0 ; j<16 ; j++) {
				var m = readdata_arr[i*16+j];
				sum = (sum + m) & 0xff;
				str += (" " + ("0"+m.toString(16)).slice(-2));
			}
			str += (" | " + ("0"+sum.toString(16)).slice(-2) + "\n");
			memaddr += 16;
		}

		document.getElementById('mem_dumpdata').value = str;
	};

	if (onConnect && address != NaN) {
		testps.avm.read(address, 256, function(result, readdata) {
			if (result) {
				textdump(readdata);
			}
		});
	}
}

// �������Ƀe�X�g�f�[�^���������� 
function memwrite() {
	var address = (parseInt(document.getElementById('mem_address').value, 16))>>>0;

	if (onConnect && address != NaN) {
		var writedata = new ArrayBuffer(256);
		var writedata_arr = new Uint8Array(writedata);

		for(var i=0 ; i<writedata.byteLength ; i++) writedata_arr[i] = (i & 0xff);

		testps.avm.write(address, writedata, function(result) {
			if (result) {
			}
		});
	}
}


