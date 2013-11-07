// ------------------------------------------------------------------- //
//  Physicaloid Library for Chrome Package Apps                        //
// ------------------------------------------------------------------- //
//
//  ver 0.9.3
//		Nov 06.2013	s.osafune@gmail.com
//
//
// ******************************************************************* //
//     Copyright (C) 2013, J-7SYSTEM Works.  All rights Reserved.      //
//                                                                     //
// * This module is a free sourcecode and there is NO WARRANTY.        //
// * No restriction on use. You can use, modify and redistribute it    //
//   for personal, non-profit or commercial products UNDER YOUR        //
//   RESPONSIBILITY.                                                   //
// * Redistributions of source code must retain the above copyright    //
//   notice.                                                           //
//                                                                     //
//         Physicaloid Project - http://www.physicaloid.com/           //
//                                                                     //
// ******************************************************************* //

// API
//	.open(port portname, function callback(bool result));
//	.close(function callback(bool result));
//	.upload(obj boardInfo, arraybuffer rbfdata[], function callback(bool result));
//	.read(int requestBytes, function callback(bool result, int bytesRead, arraybuffer readdata[]));
//	.write(arraybuffer writedata[], function callback(bool result, int bytesWritten));
//	.reset(function callback(bool result));
//	.avm.read(uint address, int bytenum, function callback(bool result, arraybuffer readdata[]));
//	.avm.write(uint address, arraybuffer writedata[], function callback(bool result));
//	.avm.iord(uint address, int offset, function callback(bool result, uint readdata));
//	.avm.iowr(uint address, int offset, uint writedata, function callback(bool result));
//	.avm.option(object option, function callback(bool result));

var Physicaloid = function() {
	var self = this;

	//////////////////////////////////////////////////
	//  ���J�I�u�W�F�N�g 
	//////////////////////////////////////////////////

	// �ڑ����Ă���{�[�h�̏�� 
	// Information of the board that this object is connected
	self.boardInfo = null;
//	{
//		version : 1,
//		manufacturerId : uint16,
//		productId : uint16,
//		serialnumber : uint32
//	};

	// �f�t�H���g�̃r�b�g���[�g 
	// The default bitrate
	self.serialBitrate = 115200;


	// API 
	self.open	= function(portname, callback){ devopen(portname, callback); };
	self.close	= function(callback){ devclose(callback); };
	self.upload	= function(boardInfo, rbfarraybuf, callback){ devconfig(boardInfo, rbfarraybuf, callback); };
	self.read	= function(bytenum, callback){ serlaread(bytenum, callback); };
	self.write	= function(wirtearraybuf, callback){ serialwrite(wirtearraybuf, callback); };
	self.reset	= function(callback){ devreset(callback); };

	self.avm = {
		read	: function(address, readbytenum, callback){ avmread(address, readbytenum, callback); },
		write	: function(address, writedata, callback){ avmwrite(address, writedata, callback); },
		iord	: function(address, offset, callback){ avmiord(address, offset, callback); },
		iowr	: function(address, offset, writedata, callback){ avmiowr(address, offset, writedata, callback); },
		option	: function(option, callback){ avmoption(option, callback); }
	};

	self.i2c = {
		start	: function(callback){ i2cstart(callback); },
		stop	: function(callback){ i2cstop(callback); },
		read	: function(ack, callback){ i2cread(ack, callback); },
		write	: function(writebyte, callback){ i2cwrite(writebyte, callback); }
	};



	//////////////////////////////////////////////////
	//  �����ϐ�����уp�����[�^ 
	//////////////////////////////////////////////////

	// ���̃I�u�W�F�N�g�Ɋ���U��ꂽ�R�l�N�V����ID 
	// Connection ID allocated to this object
	var connectionId = 0;

	// ���̃I�u�W�F�N�g���{�[�h�ɐڑ����Ă����true 
	// True this object if connected to the board
	var onConnect = false;

	// ���̃I�u�W�F�N�g���ڑ����Ă���{�[�h�����s�\��Ԃł����true 
	// True board of this object if it is ready to run
	var confrun = false;

	// AvalonMM�g�����U�N�V�����̑��������I�v�V���� 
	// Send Immediate option of the Avalon-MM Transaction
	var avmSendImmediate = false;


	// �V���A���|�[�g���^�C���A�E�g�����Ɣ��肷��܂ł̎��s�� 
	// Number of attempts to determine the serial port has timed out
	var serialTimeoutCycle = 200;

	// I2C�o�X���^�C���A�E�g�����Ɣ��肷��܂ł̎��s�� 
	// Number of attempts to determine I2C has timed out
	var i2cTimeoutCycle = 100;

	// FPGA�R���t�B�O���[�V�������^�C���A�E�g�����Ɣ��肷��܂ł̎��s�� 
	// Number of attempts to determine FPGA-Configuration has timed out
	var configTimeoutCycle = 100;

	// AvalonMM�g�����U�N�V�����p�P�b�g�̍ő咷 
	// The maximum length of the Avalon-MM Transaction packets
	var avmTransactionMaxLength = 32768;



	//////////////////////////////////////////////////
	//  ��{���\�b�h 
	//////////////////////////////////////////////////

	// Physicaloid�f�o�C�X�|�[�g�̃I�[�v�� 
	//	devopen(port portname, function callback(bool result));

	var devopen = function(portname, callback) {
		if (onConnect) {
			callback(false);		// ���ɐڑ����m�����Ă���ꍇ 
			return;
		}

		self.boardInfo = null;
		avmSendImmediate = false;


		// �V���A���|�[�g�ڑ� 
		var connect = function() {
			var options = {bitrate:self.serialBitrate};

			chrome.serial.open(portname, options, function (openInfo) {
				if (openInfo.connectionId > 0) {
					connectionId = openInfo.connectionId;
					onConnect = true;
					confrun = false;
					console.log("serial : Open connectionId = " + connectionId + " (" + portname + ", " + options.bitrate + "bps)");

					psconfcheck();
				} else {
					console.log("serial : [!] " + selectedPort + " is not connected.");

					open_exit(false);
				}
			});
		};

		// Physicaloid�R���t�B�O���[�^�����̃e�X�g 
		var psconfcheck = function() {
			commandtrans(0x39, function(result, respbyte) {
				if (result) {
					console.log("board : Confirm acknowledge.");
					getboardinfo();					// �R�}���h�ɉ����������� 
				} else {
					console.log("board : [!] No response.");
					open_exit(false);				// �R�}���h�ɉ������Ȃ����� 
				}
			});
		};

		// �{�[�h���̎擾 
		var getboardinfo = function() {
			eepromread(function(result, readdata) {
				if (result) {
					var readdata_arr = new Uint8Array(readdata);
					var header = (readdata_arr[0] << 16) | (readdata_arr[1] << 8) | (readdata_arr[2] << 0);

					if (header == 0x4a3757) {		// J7W�̃w�b�_������ 
						self.boardInfo = {
							version : (readdata_arr[3]),
							manufacturerId : (((readdata_arr[4] << 8) | (readdata_arr[5] << 0))>>> 0),
							productId : (((readdata_arr[6] << 8) | (readdata_arr[7] << 0))>>> 0),
							serialnumber : (((readdata_arr[8] << 24) | (readdata_arr[9] << 16) |
											(readdata_arr[10] << 8)|(readdata_arr[11] << 0))>>> 0)
						};
					} else {
						self.boardInfo = {			// J7W�̃w�b�_��������Ȃ� 
							version : 1,
							manufacturerId : (0xffff >>> 0),
							productId : (0xffff >>> 0),
							serialnumber : (0xffffffff >>> 0)
						};
					}

					open_exit(true);
				} else {
					self.boardInfo = {				// EEPROM��������Ȃ� 
						version : 1,
						manufacturerId : 0x0000,
						productId : 0x0000,
						serialnumber : 0x00000000
					};

					open_exit(true);
				}
			});
		};

		connect();

		var open_exit = function(result) {
			if (result) {
				console.log("board : version = " + self.boardInfo.version + "\n" + 
							"        manufacturer ID = 0x" + ("0000"+self.boardInfo.manufacturerId.toString(16)).slice(-4) + "\n" +
							"        product ID = 0x" + ("0000"+self.boardInfo.productId.toString(16)).slice(-4) + "\n" +
							"        serial number = 0x" + ("00000000"+self.boardInfo.serialnumber.toString(16)).slice(-8)
				);

				callback(true);
			} else {
				if (onConnect) {
					self.close(function() {
						callback(false);
					});
				} else {
					callback(false);
				}
			}
		};
	};


	// Physicaloid�f�o�C�X�|�[�g�̃N���[�Y 
	//	devclosee(function callback(bool result));

	var devclose = function(callback) {
		if (!onConnect) {
			callback(false);		// �ڑ����m�����Ă��Ȃ��ꍇ 
			return;
		}

	    chrome.serial.close(connectionId, function () {
			console.log("serial : Close connectionId = " + connectionId);

			connectionId = 0;
			onConnect = false;
			confrun = false;
			self.boardInfo = null;

			callback(true);
	    });
	};


	// �{�[�h��FPGA�R���t�B�O���[�V���� 
	//	devconfig(obj boardInfo, arraybuffer rbfdata[],
	//						function callback(bool result));

	var configBarrier = false;
	var devconfig = function(boardInfo, rbfarraybuf, callback) {

		///// �R���t�B�O�V�[�P���X�����܂ōĎ��s��j�~���� /////

		if (!onConnect || !rbfarraybuf || configBarrier || mresetBarrier) {
			callback(false);
			return;
		}

		configBarrier = true;


		///// �o�C�g�G�X�P�[�v���� /////

		var rbfescape = new Array();
		var rbfarraybuf_arr = new Uint8Array(rbfarraybuf);
		var escape_num = 0;

		for(var i=0 ; i<rbfarraybuf.byteLength ; i++) {
			if (rbfarraybuf_arr[i] == 0x3a || rbfarraybuf_arr[i] == 0x3d) {
				rbfescape.push(0x3d);
				rbfescape.push(rbfarraybuf_arr[i] ^ 0x20);
				escape_num++;
			} else {
				rbfescape.push(rbfarraybuf_arr[i]);
			}
		}

		var rbfescapebuf = new ArrayBuffer(rbfescape.length);
		var rbfescapebuf_arr = new Uint8Array(rbfescapebuf);
		var checksum = 0;

		for(var i=0 ; i<rbfescape.length ; i++) {
			rbfescapebuf_arr[i] = rbfescape[i];
			checksum = (checksum + rbfescapebuf_arr[i]) & 0xff;
		}

		console.log("config : " + escape_num + " places were escaped. config data size = " + rbfescapebuf.byteLength + "bytes");
//		console.log("config : config data checksum = 0x" + ("0"+checksum.toString(16)).slice(-2));


		///// FPGA�R���t�B�O���[�V�����V�[�P���T /////

		var sendretry = 0;		// �^�C���A�E�g�J�E���^ 

		// FPGA�̃R���t�B�O���[�V�����J�n���� 
		var setup = function() {
			commandtrans(0x39, function (result, respbyte) {
				if (result) {
					if ((respbyte & 0x01)== 0x00) {		// PS���[�h 
						console.log("config : configuration is started.");
						sendretry = 0;
						sendinit();
					} else {
						console.log("config : [!] Setting is not in the PS mode.");
						errorabort();
					}
				} else {
					errorabort();
				}
			});
		};

		// �R���t�B�O���[�V�����J�n���N�G�X�g���s 
		var sendinit = function() {
			commandtrans(0x30, function (result, respbyte) {	// �R���t�B�O���[�h�AnCONFIG�A�T�[�g 
				if (result || sendretry < configTimeoutCycle) {
					if ((respbyte & 0x06)== 0x00) {		// nSTATUS = L, CONF_DONE = L
						sendretry = 0;
						sendready();
					} else {
						sendretry++;
						sendinit();
					}
				} else {
					console.log("config : [!] nCONFIG request is timeout.");
					errorabort();
				}
			});
		};

		// FPGA����̉�����҂� 
		var sendready = function() {
			commandtrans(0x31, function (result, respbyte) {	// �R���t�B�O���[�h�AnCONFIG�l�Q�[�g 
				if (result || sendretry < configTimeoutCycle) {
					if ((respbyte & 0x06)== 0x02) {		// nSTATUS = H, CONF_DONE = L
						sendretry = 0;
						sendrbf();
					} else {
						sendretry++;
						sendready();
					}
				} else {
					console.log("config : [!] nSTATUS response is timeout.");
					errorabort();
				}
			});
		};

		// �R���t�B�O�t�@�C�����M 
		var sendrbf = function() {
			serialwrite(rbfescapebuf, function (result, bytewritten) {
				if (result) {
					console.log("config : " + bytewritten + "bytes of configuration data was sent.");
					checkstatus();
				} else {
					errorabort();
				}
			});
		};

		// �R���t�B�O�����`�F�b�N 
		var checkstatus = function() {
			commandtrans(0x31, function (result, respbyte) {	// �R���t�B�O���[�h�A�X�e�[�^�X�`�F�b�N 
				if (result) {
					if ((respbyte & 0x06)== 0x06) {		// nSTATUS = H, CONF_DONE = H
						switchuser();
					} else {
						errordone();
					}
				} else {
					errorabort();
				}
			});
		};

		// �R���t�B�O���� 
		var switchuser = function() {
			commandtrans(0x39, function (result, respbyte) {	// ���[�U�[���[�h 
				if (result) {
					console.log("config : configuration completion.");
					confrun = true;
					config_exit(true);
				} else {
					errorabort();
				}
			});
		};

		// �ʐM�G���[ 
		var errorabort = function() {
			console.log("config : [!] communication error abort.");
			config_exit(false);
		};

		// �R���t�B�O�G���[ 
		var errordone = function() {
			console.log("config : [!] configuration error.");
//			commandtrans(0x35, function (result, respbyte) {
//				if (result) {
//					console.log("config : config data byte sum = 0x" + ("0"+respbyte.toString(16)).slice(-2));
//				}
//			});

			config_exit(false);
		};


		///// �R���t�B�O���[�V�����̎��s /////

		confrun = false;
		setup();

		var config_exit = function(result) {
			configBarrier = false;
			callback(result);
		};
	};


	// �V���A���|�[�g����C�Ӓ��̃o�C�g�f�[�^�𑗐M 
	//	serialwrite(arraybuffer writedata[],
	//					function callback(bool result, int bytesWritten));

	var serialwrite = function(wirtearraybuf, callback) {
		if (!onConnect) {
			callback(false, null);			// �ڑ����m������Ă��Ȃ��ꍇ 
			return;
		}

	    chrome.serial.write(connectionId, wirtearraybuf, function (writeInfo){
			var leftbytes = wirtearraybuf.byteLength - writeInfo.bytesWritten;
			var bool_witten = false;

			if (leftbytes == 0) {
				bool_witten = true;
//				console.log("serial : write " + writeInfo.bytesWritten + "bytes success.");
			} else {
				console.log("serial : [!] write " + writeInfo.bytesWritten + "bytes written, " + leftbytes + "bytes left.");
			}

			callback(bool_witten, writeInfo.bytesWritten);
		});
	};


	// �V���A���|�[�g����C�Ӓ��̃o�C�g�f�[�^����M 
	//	serialread(int bytesReadRequest,
	//					function callback(bool result, int bytesRead, arraybuffer readdata[]));

	var serlaread = function(bytenum, callback) {
		if (!onConnect) {
			callback(false, null, null);	// �ڑ����m������Ă��Ȃ��ꍇ 
			return;
		}

		var readarraybuf = new ArrayBuffer(bytenum);
		var readarraybuf_arr = new Uint8Array(readarraybuf);
		var readarraybuf_num = 0;
		var readretry = 0;

		var read_subfunction = function(leftbytenum) {
		    chrome.serial.read(connectionId, leftbytenum, function (readInfo) {
				if (readInfo.bytesRead > 0) {
					var data_arr = new Uint8Array(readInfo.data);

					for(var i=0 ; i<readInfo.bytesRead ; i++) readarraybuf_arr[readarraybuf_num++] = data_arr[i];

					leftbytenum = leftbytenum - readInfo.bytesRead;
//					console.log("serial : read " + readInfo.bytesRead + "bytes, " + leftbytenum + "bytes left, Read retry " + readretry + "cycles.");

					if (leftbytenum > 0) {
						readretry = 0;
						read_subfunction(leftbytenum);
					} else {
						callback(true, readarraybuf_num, readarraybuf);
					}
				} else {
					if (readretry < serialTimeoutCycle) {
						readretry++;
						read_subfunction(leftbytenum);
					} else {
						console.log("serial : [!] read is timeout.");
						callback(false, 0, null);
					}
				}
			});
		};

		read_subfunction(bytenum);
	};


	// �{�[�h�̃}�j���A�����Z�b�g 
	//	devreset(function callback(bool result));

	var mresetBarrier = false;
	var devreset = function(callback) {
		if (!onConnect || !confrun || mresetBarrier) {
			callback(false);
			return;
		}

		mresetBarrier = true;

		var dummycycle = 10;
		var resetassert = function() {
			commandtrans(0x31, function (result, respbyte) {	// 16ms�̃^�C���A�E�g���o�x����O�� 
				if (result) {
					if (dummycycle > 0) {			// 10��̃_�~�[�R�}���h�𔭍s���Ď��Ԃ����� 
						dummycycle--;
						resetassert();
					} else {
						resetnegate();
					}
				} else {
					mreset_exit(false);
				}
			});
		};

		var resetnegate = function() {
			commandtrans(0x39, function (result, respbyte) {
				if (result) {
					console.log("mreset : The issue complete.");
					avmSendImmediate = false;
					reset_exit(true);
				} else {
					reset_exit(false);
				}
			});
		};

		resetassert();

		var reset_exit = function(result) {
			mresetBarrier = false;
			callback(result);
		};
	};



	//////////////////////////////////////////////////
	//  Avalon-MM�g�����U�N�V�������\�b�h 
	//////////////////////////////////////////////////

	// AvalonMM�I�v�V�����ݒ� 
	//	avmoption(object option,
	//					function callback(bool result);

	var avmoption = function(option, callback) {
//		if (!onConnect || !confrun || mresetBarrier) {
		if (!onConnect || mresetBarrier) {
			callback(false);
			return;
		}

		if (option.fastAcknowledge != null) {
			if (option.fastAcknowledge) {
				avmSendImmediate = true;
			} else {
				avmSendImmediate = false;
			}

			var com = 0x39;
			if (avmSendImmediate) com |= 0x02;	// �����������[�h�r�b�g 

			commandtrans(com, function (result, respbyte) {
				if (result) {
					console.log("avm : Set option send immediate is " + avmSendImmediate);
					callback(true);
				} else {
					callback(false);
				}
			});
		}
	};


	// AvalonMM�y���t�F�������[�h(IORD)
	//	avmiord(uint address, int offset,
	//					function callback(bool result, uint readdata));

	var avmiord = function(address, offset, callback) {
		if (!onConnect || !confrun || mresetBarrier) {
			callback(false, null);
			return;
		}

		var regaddr = ((address & 0xfffffffc)>>> 0) + (offset << 2);
		var writepacket = new avmPacket(0x10, 4, regaddr, 0);	// �V���O�����[�h�p�P�b�g�𐶐� 

		avmtrans(writepacket, function (result, readpacket) {
			var res = false;
			var readdata = null;

			if (result) {
				if (readpacket.byteLength == 4) {
					var readpacket_arr = new Uint8Array(readpacket);
					readdata = (
						(readpacket_arr[3] << 24) |
						(readpacket_arr[2] << 16) |
						(readpacket_arr[1] <<  8) |
						(readpacket_arr[0] <<  0) )>>> 0;		// �����Ȃ�32bit���� 
					res = true;

					console.log("avm : iord(0x" + ("00000000"+address.toString(16)).slice(-8) + ", " + offset + ") = 0x" + ("00000000"+readdata.toString(16)).slice(-8));
				}
			}

			callback(res, readdata);
		});
	};


	// AvalonMM�y���t�F�������C�g(IOWR)
	//	avmiowr(uint address, int offset, uint writedata,
	//					function callback(bool result));

	var avmiowr = function(address, offset, writedata, callback) {
		if (!onConnect || !confrun || mresetBarrier) {
			callback(false);
			return;
		}

		var regaddr = ((address & 0xfffffffc)>>> 0) + (offset << 2);
		var writepacket = new avmPacket(0x00, 4, regaddr, 4);	// �V���O�����C�g�p�P�b�g�𐶐� 
		var writepacket_arr = new Uint8Array(writepacket);

		writepacket_arr[8]  = (writedata >>>  0) & 0xff;		// �����Ȃ�32bit���� 
		writepacket_arr[9]  = (writedata >>>  8) & 0xff;
		writepacket_arr[10] = (writedata >>> 16) & 0xff;
		writepacket_arr[11] = (writedata >>> 24) & 0xff;

		avmtrans(writepacket, function (result, readpacket) {
			var res = false;

			if (result) {
				var readpacket_arr = new Uint8Array(readpacket);
				var size = (readpacket_arr[2] << 8) | (readpacket_arr[3] << 0);

				if (readpacket_arr[0] == 0x80 && size == 4) {
					res = true;

					console.log("avm : iowr(0x" + ("00000000"+address.toString(16)).slice(-8) + ", " + offset + ", 0x" + ("00000000"+writedata.toString(16)).slice(-8) + ")");
				}
			}

			callback(res);
		});
	};


	// AvalonMM���������[�h(IORD_DIRECT)
	//	avmread(uint address, int bytenum,
	//					function callback(bool result, arraybuffer readdata[]));

	var avmread = function(address, readbytenum, callback) {
		if (!onConnect || !confrun || mresetBarrier) {
			callback(false, null);
			return;
		}

		var readdata = new ArrayBuffer(readbytenum);
		var readdata_arr = new Uint8Array(readdata);
		var byteoffset = 0;

		var avmread_partial = function(leftbytenum) {
			var bytenum = leftbytenum;
			if (bytenum > avmTransactionMaxLength) bytenum = avmTransactionMaxLength;

			var writepacket = new avmPacket(0x14, bytenum, address+byteoffset, 0);		// �C���N�������^�����[�h�p�P�b�g�𐶐� 

			avmtrans(writepacket, function (result, readpacket) {
				if (result) {
					if (readpacket.byteLength == bytenum) {
						var readpacket_arr = new Uint8Array(readpacket);

						for(var i=0 ; i<bytenum ; i++) readdata_arr[byteoffset++] = readpacket_arr[i];
						leftbytenum -= bytenum;

						console.log("avm : read " + bytenum + "bytes from address 0x" + ("00000000"+address.toString(16)).slice(-8));

						if (leftbytenum > 0) {
							avmread_partial(leftbytenum);
						} else {
							callback(true, readdata);
						}
					} else {
						callback(false, null);
					}
				} else {
					callback(false, null);
				}
			});
		};

		avmread_partial(readbytenum);
	};


	// AvalonMM���������C�g(IOWR_DIRECT)
	//	avmwrite(uint address, arraybuffer writedata[],
	//					function callback(bool result));

	var avmwrite = function(address, writedata, callback) {
		if (!onConnect || !confrun || mresetBarrier) {
			callback(false, null);
			return;
		}

		var writedata_arr = new Uint8Array(writedata);
		var byteoffset = 0;

		var avmwrite_partial = function(leftbytenum) {
			var bytenum = leftbytenum;
			if (bytenum > avmTransactionMaxLength) bytenum = avmTransactionMaxLength;

			var writepacket = new avmPacket(0x04, bytenum, address+byteoffset, bytenum);	// �C���N�������^�����C�g�p�P�b�g�𐶐� 
			var writepacket_arr = new Uint8Array(writepacket);

			for(var i=0 ; i<bytenum ; i++) writepacket_arr[8+i] = writedata_arr[byteoffset++];

			avmtrans(writepacket, function (result, readpacket) {
				if (result) {
					var readpacket_arr = new Uint8Array(readpacket);
					var size = (readpacket_arr[2] << 8) | (readpacket_arr[3] << 0);

					if (readpacket_arr[0] == 0x84 && size == bytenum) {
						leftbytenum -= bytenum;

						console.log("avm : written " + bytenum + "bytes to address 0x" + ("00000000"+address.toString(16)).slice(-8));

						if (leftbytenum > 0) {
							avmwrite_partial(leftbytenum);
						} else {
							callback(true);
						}
					} else {
						callback(false);
					}
				} else {
					callback(false);
				}
			});
		};

		avmwrite_partial(writedata.byteLength);
	};



	//////////////////////////////////////////////////
	//  �������\�b�h (�g�����U�N�V�����R�}���h�Q)
	//////////////////////////////////////////////////

	// �R���t�B�O���[�V�����R�}���h�̑���M 
	//	commandtrans(int command, function callback(bool result, int response);
	var commandBarrier = false;
	var commandtrans = function(command, callback) {

		///// �R�}���h����M�����܂ōĎ��s��j�~���� /////

		if (commandBarrier) {
			callback(false, null);
			return;
		}

		commandBarrier = true;


		///// �R�}���h�̐����Ƒ���M /////

		var send_data = new ArrayBuffer(2);
		var send_data_arr = new Uint8Array(send_data);

		send_data_arr[0] = 0x3a;
		send_data_arr[1] = command & 0xff;
//		console.log("config : send config command = 0x" + ("0"+send_data_arr[1].toString(16)).slice(-2));

		serialwrite(send_data, function (result, bytes){
			if (result) {
				serlaread(1, function(result, readnum, readarraybuf) {
					if (result) {
						var resp_data_arr = new Uint8Array(readarraybuf);
						var respbyte = resp_data_arr[0];
//						console.log("config : recieve config response = 0x" + ("0"+respbyte.toString(16)).slice(-2));
						commandtrans_exit(true, respbyte);
					} else {
						commandtrans_exit(false, null);
					}
				});
			} else {
				commandtrans_exit(false, null);
			}
		});

		var commandtrans_exit = function(result, respbyte) {
			commandBarrier = false;
			callback(result, respbyte);
		};
	};


	// AvalonMM�g�����U�N�V�����p�P�b�g���쐬 
	// arraybuffer avmPacket(int command, uint size, uint address, int datasize);
	var avmPacket = function(command, size, address, datasize) {
		var packet = new ArrayBuffer(8 + datasize);
		var packet_arr = new Uint8Array(packet);

		packet_arr[0] = command & 0xff;
		packet_arr[1] = 0x00;
		packet_arr[2] = (size >>> 8) & 0xff;
		packet_arr[3] = (size >>> 0) & 0xff;
		packet_arr[4] = (address >>> 24) & 0xff;
		packet_arr[5] = (address >>> 16) & 0xff;
		packet_arr[6] = (address >>>  8) & 0xff;
		packet_arr[7] = (address >>>  0) & 0xff;

		return packet;
	};


	// �g�����U�N�V�����p�P�b�g�̑���M 
	//	avmtrans(arraybuffer writepacket[],
	//						function callback(bool result, arraybuffer readpacket[]));
	var avmBarrier = false;
	var avmtrans = function(writepacket, callback) {

		///// �p�P�b�g����M�����܂ōĎ��s��j�~���� /////

		if (avmBarrier) {
			callback(false, null);
			return;
		}

		avmBarrier = true;


		///// ���M�p�P�b�g�O���� /////

		var writepacket_arr = new Uint8Array(writepacket);
		var sendarray = new Array();

		sendarray.push(0x7a);		// SOP
		sendarray.push(0x7c);		// CNI
		sendarray.push(0x00);		// Ch.0 (�_�~�[)

		for(var i=0 ; i<writepacket.byteLength ; i++) {
			// EOP�̑}�� 
			if (i == writepacket.byteLength-1) sendarray.push(0x7b);	// EOP 

			// Byte to Packet Converter���̃o�C�g�G�X�P�[�v 
			if (writepacket_arr[i] == 0x7a || writepacket_arr[i] == 0x7b || writepacket_arr[i] == 0x7c || writepacket_arr[i] == 0x7d) {
				sendarray.push(0x7d);
				sendarray.push(writepacket_arr[i] ^ 0x20);

			// Physicaloid Configrator���̃o�C�g�G�X�P�[�v 
			} else if (writepacket_arr[i] == 0x3a || writepacket_arr[i] == 0x3d) {
				sendarray.push(0x3d);
				sendarray.push(writepacket_arr[i] ^ 0x20);

			// ����ȊO 
			} else {
				sendarray.push(writepacket_arr[i]);
			}
		}

		var send_data = new ArrayBuffer(sendarray.length);
		var send_data_arr = new Uint8Array(send_data);

		for(var i=0 ; i<sendarray.length ; i++) send_data_arr[i] = sendarray[i];

//		var sendstr = "";
//		for(var i=0 ; i<send_data.byteLength ; i++) sendstr = sendstr + ("0"+send_data_arr[i].toString(16)).slice(-2) + " ";
//		console.log("avm : sending data = " + sendstr);


		///// �p�P�b�g��M���� /////

		var resparray = new Array();
		var recvlogarray = new Array();		// ���O�p 
		var recvSOP = false;
		var recvEOP = false;
		var recvCNI = false;
		var recvESC = false;

		var avmtrans_recv = function() {
			serlaread(1, function (result, readnum, recvdata) {
				if (result) {
					var recvexit = false;
					var recvdata_arr = new Uint8Array(recvdata);
					var recvbyte = recvdata_arr[0];

					recvlogarray.push(recvbyte);		// ��M�f�[�^��S�ă��O(�e�X�g�p) 

					// �p�P�b�g�t���[���̊O���̏��� 
					if (!recvSOP) {
						if (recvCNI) {				// CNI�̂Q�o�C�g�ڂ̏ꍇ�͓ǂݎ̂Ă� 
							recvCNI = false;
						} else {
							switch(recvbyte) {
							case 0x7a:				// SOP����M 
								recvSOP = true;
								break;

							case 0x7c:				// CNI����M 
								recvCNI = true;
								break;
							}
						}

					// �p�P�b�g�t���[���̓����̏��� 
					} else {
						if (recvCNI) {				// CNI�̂Q�o�C�g�ڂ̏ꍇ�͓ǂݎ̂Ă� 
							recvCNI = false;

						} else if (recvESC) {		// ESC�̂Q�o�C�g�ڂ̏ꍇ�̓o�C�g�������Ēǉ� 
							recvESC = false;
							resparray.push(recvbyte ^ 0x20);

							if (recvEOP) {			// ESC��EOP�̂Q�o�C�g�ڂ������ꍇ�͂����ŏI�� 
								recvEOP = false;
								recvSOP = false;
								recvexit = true;
							}

						} else if (recvEOP) {		// EOP�̂Q�o�C�g�ڂ̏ꍇ�̏��� 
							if (recvbyte == 0x7d) {		// �㑱���o�C�g�G�X�P�[�v����Ă���ꍇ�͑��s 
								recvESC = true;
							} else {					// �G�X�P�[�v�łȂ���΃o�C�g�ǉ����ďI�� 
								resparray.push(recvbyte);
								recvEOP = false;
								recvSOP = false;
								recvexit = true;
							}

						} else {					// ��s�o�C�g���p�P�b�g�w���q�ł͂Ȃ��ꍇ 
							switch(recvbyte) {
							case 0x7a:				// SOP��M 
								break;				// �p�P�b�g���ɂ�SOP�͏o�����Ȃ��̂ŃG���[�ɂ��ׂ��H 

							case 0x7b:				// EOP��M 
								recvEOP = true;
								break;

							case 0x7c:				// CNI��M 
								recvCNI = true;
								break;

							case 0x7d:				// ESC��M 
								recvESC = true;
								break;

							default:				// ����ȊO�̓o�C�g�ǉ�  
								resparray.push(recvbyte);
							}
						}
					}

					if (recvexit) {
						// ���X�|���X�p�P�b�g�̐��` 
						var readpacket = new ArrayBuffer(resparray.length);
						var readpacket_arr = new Uint8Array(readpacket);

						for(var i=0 ; i<resparray.length ; i++) readpacket_arr[i] = resparray[i];

//						var recvstr = "";
//						for(var i=0 ; i<recvlogarray.length ; i++) recvstr = recvstr + ("0"+recvlogarray[i].toString(16)).slice(-2) + " ";
//						console.log("avm : received data = " + recvstr);

						avmtrans_exit(true, readpacket);
					} else {
						avmtrans_recv();
					}

				} else {
					// �o�C�g�f�[�^�̎�M�Ɏ��s�����ꍇ 
					avmtrans_exit(false, null);
				}
			});
		};


		///// �p�P�b�g�̑���M /////

		serialwrite(send_data, function (result, bytes) {
			if (result) {
				avmtrans_recv();
			} else {
				avmtrans_exit(false, null);
			}
		});

		var avmtrans_exit = function(result, readpacket) {
			avmBarrier = false;
			callback(result, readpacket);
		};
	};



	//////////////////////////////////////////////////
	//  �������\�b�h (I2C�R�}���h�Q)
	//////////////////////////////////////////////////

	var i2cBarrier = false;

	// 1bit�f�[�^��ǂރT�u�t�@���N�V���� (�K��SCL='L'����s���Ă�����̂Ƃ���) 
	// i2cbitread(function callback(bool result, int readbit));
	var i2cbitread = function(callback) {
		var readbit = 0;
		var timeout = 0;
		var setup = function() {
			commandtrans(0x3b, function(result, respbyte) {		// SDA='Z',SCL='H',�������� 
				if (result) {
					if ((respbyte & 0x10)== 0x10) {				// SCL�������オ������SDA��ǂ� 
						if ((respbyte & 0x20)== 0x20) readbit = 1;
						change();
					} else {
						if (timeout < i2cTimeoutCycle) {
							timeout++;
							setup();
						} else {
							console.log("i2c : [!] Read condition is timeout.");
							callback(false, null);
						}
					}
				} else {
					callback(false, null);
				}
			});
		};

		var change = function() {
			commandtrans(0x2b, function(result, respbyte) {		// SDA='Z',SCL='L',�������� 
				if (result) {
					callback(true, readbit);
				} else {
					callback(false, null);
				}
			});
		};

		setup();
	};

	// 1bit�f�[�^�������T�u�t�@���N�V���� (�K��SCL='L'����s���Ă�����̂Ƃ���) 
	// i2cbitwrite(int writebit, function callback(bool result));
	var i2cbitwrite = function(writebit, callback) {
		var setup = function() {
			var com = (writebit << 5) | 0x0b;
			commandtrans(com, function(result, respbyte) {		// SDA=writebit,SCL='L',�������� 
				if (result) {
					hold();
				} else {
					callback(false);
				}
			});
		};

		var timeout = 0;
		var hold = function() {
			var com = (writebit << 5) | 0x1b;
			commandtrans(com, function(result, respbyte) {		// SDA=writebit,SCL='H',�������� 
				if (result) {
					if ((respbyte & 0x30) == (com & 0x30)) {	// SCL�������オ�����玟�� 
						change();
					} else {
						if (timeout < i2cTimeoutCycle) {
							timeout++;
							hold();
						} else {
							console.log("i2c : [!] Write condition is timeout.");
							callback(false);
						}
					}
				} else {
					callback(false);
				}
			});
		};

		var change = function() {
			var com = (writebit << 5) | 0x0b;
			commandtrans(com, function(result, respbyte) {		// SDA=writebit,SCL='L',�������� 
				if (result) {
					callback(true);
				} else {
					callback(false);
				}
			});
		};

		setup();
	};

	// �X�^�[�g�R���f�B�V�����̑��M 
	// i2cstart(function callback(bool result));
	var i2cstart = function(callback) {
		if (i2cBarrier) {
			callback(false);
			return;
		}

		i2cBarrier = true;

		var timeout = 0;
		var setup = function() {
			commandtrans(0x3b, function(result, respbyte) {		// SDA='H',SCL='H',�������� 
				if (result) {
					if ((respbyte & 0x30)== 0x30) {
						sendstart();
					} else {
						if (timeout < i2cTimeoutCycle) {
							timeout++;
							setup();
						} else {
							console.log("i2c : [!] Start condition is timeout.");
							i2cstart_exit(false);
						}
					}
				} else {
					i2cstart_exit(false);
				}
			});
		};

		var sendstart = function() {
			commandtrans(0x1b, function(result, respbyte) {		// SDA='L',SCL='H',�������� 
				if (result) {
					sclassert();
				} else {
					i2cstart_exit(false);
				}
			});
		};

		var sclassert = function() {
			commandtrans(0x0b, function(result, respbyte) {		// SDA='L',SCL='L',�������� 
				if (result) {
//					console.log("i2c : Start condition.");
					i2cstart_exit(true);
				} else {
					i2cstart_exit(false);
				}
			});
		};

		setup();

		var i2cstart_exit = function(result) {
			i2cBarrier = false;
			callback(result);
		};
	};

	// �X�g�b�v�R���f�B�V�����̑��M (�K��SCL='L'����s���Ă�����̂Ƃ���) 
	// i2cstop(function callback(bool result));
	var i2cstop = function(callback) {
		if (i2cBarrier) {
			callback(false);
			return;
		}

		i2cBarrier = true;

		var timeout = 0;
		var setup = function() {
			commandtrans(0x0b, function(result, respbyte) {		// SDA='L',SCL='L',�������� 
				if (result) {
					sclrelease();
				} else {
					i2cstop_exit(false);
				}
			});
		};

		var sclrelease = function() {
			commandtrans(0x1b, function(result, respbyte) {		// SDA='L',SCL='H',�������� 
				if (result) {
					if ((respbyte & 0x30)== 0x10) {
						timeout = 0;
						sendstop();
					} else {
						if (timeout < i2cTimeoutCycle) {
							timeout++;
							setup();
						} else {
							console.log("i2c : [!] Stop condition is timeout.");
							i2cstop_exit(false);
						}
					}
				} else {
					i2cstop_exit(false);
				}
			});
		};

		var sendstop = function() {
			var com = 0x39;
			if (avmSendImmediate) com |= 0x02;					// �����������[�h�r�b�g 

			commandtrans(com, function(result, respbyte) {		// SDA='H',SCL='H' 
				if (result) {
					if ((respbyte & 0x30)== 0x30) {
//						console.log("i2c : Stop condition.");
						i2cstop_exit(true);
					} else {
						if (timeout < i2cTimeoutCycle) {
							timeout++;
							sendstop();
						} else {
							console.log("i2c : [!] Stop condition is timeout.");
							i2cstop_exit(false);
						}
					}
				} else {
					i2cstop_exit(false);
				}
			});
		};

		setup();

		var i2cstop_exit = function(result) {
			i2cBarrier = false;
			callback(result);
		};
	};

	// �o�C�g���[�h (�K��SCL='L'����s���Ă�����̂Ƃ���) 
	// i2cread(bool ack, function callback(bool result, int readbyte));
	var i2cread = function(ack, callback) {
		if (i2cBarrier) {
			callback(false, null);
			return;
		}

		i2cBarrier = true;

		var bitnum = 0;
		var readbyte = 0x00;

		var byteread = function() {
			i2cbitread(function(result, readbit) {
				if (result) {
					readbyte |= readbit;
	
					if (bitnum < 7) {
						bitnum++;
						readbyte <<= 1;
						byteread();
					} else {
						sendack();
					}
				} else {
					i2cread_exit(false, null);
				}
			});
		};

		var sendack = function() {
			var ackbit = 0;
			if (!ack) ackbit = 1;	// NACK

			i2cbitwrite(ackbit, function(result) {
				if (result) {
//					var str = " ACK";
//					if (!ack) str = " NACK";
//					console.log("i2c : read 0x" + ("0"+readbyte.toString(16)).slice(-2) + str);

					i2cread_exit(true, readbyte);
				} else {
					i2cread_exit(false, null);
				}
			});

		};

		byteread();

		var i2cread_exit = function(result, respbyte) {
			i2cBarrier = false;
			callback(result, respbyte);
		};
	};

	// �o�C�g���C�g (�K��SCL='L'����s���Ă�����̂Ƃ���) 
	// i2cwrite(int writebyte, function callback(bool result, bool ack));
	var i2cwrite = function(writebyte, callback) {
		if (i2cBarrier) {
			callback(false);
			return;
		}

		i2cBarrier = true;

		var bitnum = 0;
		var senddata = writebyte;
		var bytewrite = function() {
			var writebit = 0;
			if ((senddata & 0x80)!= 0x00) writebit = 1;

			i2cbitwrite(writebit, function(result) {
				if (result) {
					if (bitnum < 7) {
						bitnum++;
						senddata <<= 1;
						bytewrite();
					} else {
						recvack();
					}
				} else {
					i2cwrite_exit(false, null);
				}
			});
		};

		var recvack = function() {
			i2cbitread(function(result, readbit) {
				if (result) {
					var ack = true;
					if (readbit != 0) ack = false;

//					var str = " ACK";
//					if (!ack) str = " NACK";
//					console.log("i2c : write 0x" + ("0"+writebyte.toString(16)).slice(-2) + str);

					i2cwrite_exit(true, ack);
				} else {
					i2cwrite_exit(false, null);
				}
			});
		};

		bytewrite();

		var i2cwrite_exit = function(result, ack) {
			i2cBarrier = false;
			callback(result, ack);
		};
	};


	// �{�[�h��EEPROM��ǂݏo�� 
	// eepromread(function callback(bool result, arraybuffer readdata[]));
	var eepromBarrier = false;
	var eepromread = function(callback) {
		if (eepromBarrier) {
			callback(false, null);
			return;
		}

		eepromBarrier = true;
		var si_backup = avmSendImmediate;
		avmSendImmediate = true;

		var deviceaddr = 0xa0;
		var readdata = new ArrayBuffer(12);
		var readdata_arr = new Uint8Array(readdata);

		var byteread = function(byteaddr, callback) {
			var data = null;

			var start = function() {
				i2cstart(function(result) {
					if (result) {
						devwriteopen();
					} else {
						exit();
					}
				});
			};

			var devwriteopen = function() {
				i2cwrite((deviceaddr | 0), function(result, ack) {
					if (result && ack) {
						setaddr();
					} else {
						console.log("i2c : [!] Device 0x" + ("0"+deviceaddr.toString(16)).slice(-2) + " is not found.");
						devclose();
					}
				});
			};

			var setaddr = function() {
				i2cwrite((byteaddr | 0), function(result, ack) {
					if (result && ack) {
						repstart();
					} else {
						devclose();
					}
				});
			};

			var repstart = function() {
				i2cstart(function(result) {
					if (result) {
						devreadopen();
					} else {
						devclose();
					}
				});
			};

			var devreadopen = function() {
				i2cwrite((deviceaddr | 1), function(result, ack) {
					if (result && ack) {
						readdata();
					} else {
						devclose();
					}
				});
			};

			var readdata = function() {
				i2cread(false, function(result, readbyte) {
					if (result) {
						data = readbyte;
					}
					devclose();
				});
			};

			var devclose = function() {
				i2cstop(function(res) {
					exit();
				});
			};

			var exit = function() {
				if (data != null) {
					callback(true, data);
				} else {
					callback(false, data);
				}
			};

			start();
		};

		var bytenum = 0;
		var idread = function() {
			byteread(bytenum, function(result, data) {
				if (result) {
					readdata_arr[bytenum++] = data;

					if (bytenum < readdata.byteLength) {
						idread();
					} else {
						eepromread_exit(true, readdata);
					}
				} else {
					eepromread_exit(false, null);
				}
			});
		};

		idread();

		var eepromread_exit = function(result, databuf) {
			eepromBarrier = false;
			avmSendImmediate = si_backup;
			callback(result, databuf);
		};
	}
}

