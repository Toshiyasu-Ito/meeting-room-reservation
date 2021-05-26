var debug;
var admin;
var ip;
var shain_cd,shain_nm;
var today,year,month,day;
var disptype = 0;	// 0: 日　1:週
var cellwidth = 0;
var ie;
var svItem;
// 表示時間を変更する場合は下記配列を修正する
const ix2time = ['09:00','09:15','09:30','09:45','10:00','10:15','10:30','10:45','11:00','11:15','11:30','11:45','12:00','12:15','12:30','12:45',
					'13:00','13:15','13:30','13:45','14:00','14:15','14:30','14:45','15:00','15:15','15:30','15:45','16:00','16:15','16:30','16:45','17:00',
					'17:15','17:30','17:45','18:00','18:15','18:30','18:45','19:00','19:15','19:30','19:45','20:00'];
var time2ix = {};
for (var i=0; i<ix2time.length; i++) {
	time2ix[ix2time[i]] = i;
}
// 一時間の単位が１５分でなくなる場合下記を修正　60分 / 15分 = 4
var daycol = 4;
var weekcol = (ix2time.length-1) / daycol;
var cellcnt = [ix2time.length-1,weekcol*7];

$(function() {
	//urlパラメータ($_GET)の取得
	 var arg  = new Object;
	 url = location.search.substring(1).split('&');
	for(i=0; url[i]; i++) {
    	var k = url[i].split('=');
    	arg[k[0]] = (k[1] == undefined ? 0:k[1]);
	}
	debug = (arg.debug == undefined ? 0:1);
	//初期処理（初期値等取得
	CommAjax(3,$.Deferred(),'','Init').done(function(ret) {
		admin = ret.admin;
		ip = ret.ip;
		shain_cd = ret.shain_cd;
		shain_nm = ret.shain_nm;
		// if (shain_cd == '') {
		// 	$( '#LoginForm' ).dialog( 'open' );
		// }
	});
	//ieか判断フラグを設定
	var userAgent = window.navigator.userAgent.toLowerCase();
	ie = (userAgent.indexOf('msie') >= 0 || userAgent.indexOf('trident') >= 0);
	today = new Date();
	year = today.getFullYear();
	month = today.getMonth() + 1;
	day = today.getDate();
	$('#rsv_day').val(year+'/'+('0'+month).slice(-2)+'/'+('0'+day).slice(-2));
	$('#rsv_day').datepicker({showButtonPanel: true});
	$('#rday').datepicker({
		onSelect: function(){
			$('#stime').focus();
			$('#rday').datepicker('hide');
		}
	});
	for (i=0; i<ix2time.length; i++) {
		$('#stime').append($('<option>').html(ix2time[i]).val(i));
		$('#etime').append($('<option>').html(ix2time[i]).val(i));
	}
	MainProc();
	DialogSetting();
//------------------------------------------------------------------------------------------------------------
//　ここからイベント
//　画面読込時・サイズ変更時に調整する。
//------------------------------------------------------------------------------------------------------------
	$(window).on('load resize', function(){
		// var w = window.innerWidth ? window.innerWidth: $(window).width();
		// if (w < 800) w = 800;
		cellwidth = Math.floor(($('body').width() - 162) / cellcnt[disptype]) - 1;
		$('.cell,.discell').width(cellwidth);
		$('.colheader').width(((cellwidth+1)*(disptype == 0 ? daycol : weekcol)-1));
		$('#rsvdata').width((cellwidth+1)*cellcnt[disptype]+4);
		$('.data_waku').each(function() {
			var wwidth,wleft,wdays;
			if (disptype == 0) {
				wwidth = ($(this).data('etime') - $(this).data('stime')) * (cellwidth+1) - 1;
				wleft = $(this).data('stime') * (cellwidth+1) - 1;
			} else {
				wdays = new Date($(this).data('rsv_day')) - new Date($('#rsv_day').val());
				wdays = wdays/(1000*60*60*24);
				wwidth = ($(this).data('etime') - $(this).data('stime'))/daycol * (cellwidth+1) - 1;
				wleft = $(this).data('stime')/daycol * (cellwidth+1) - 1 + (wdays*(cellwidth+1)*weekcol);
			}
			$(this).css('width',wwidth);
			$(this).css('left',wleft);
		});
	});
	//------------------------------------------------------------------------------------------------------------
	//　右上タイトルのクリックで会議室登録フォームの表示
	//------------------------------------------------------------------------------------------------------------
	$('.title').click(function() {
		if (admin) {
			$('#RegKaigiForm').dialog( 'open' );
		}
	});
	//------------------------------------------------------------------------------------------------------------
	//　表示（日・週）の変更
	//------------------------------------------------------------------------------------------------------------
	$('input[name="disp_dayweek"]').click( function() {
		disptype = $(this).val();
		MainProc();
	});
	//------------------------------------------------------------------------------------------------------------
	//　登録日変更
	//------------------------------------------------------------------------------------------------------------
	$('#rsv_day').change(function() {
		today = new Date($('#rsv_day').val());
		year = today.getFullYear();
		month = today.getMonth() + 1;
		day = today.getDate();
		MainProc();
	});
	//------------------------------------------------------------------------------------------------------------
	//　今日ボタンクリック
	//------------------------------------------------------------------------------------------------------------
	$('#today').click(function() {
		today = new Date();
		year = today.getFullYear();
		month = today.getMonth() + 1;
		day = today.getDate();
		$('#rsv_day').val(year+'/'+('0'+month).slice(-2)+'/'+('0'+day).slice(-2));
		MainProc();
	});
	//------------------------------------------------------------------------------------------------------------
	//　前日（週）ボタンクリック
	//------------------------------------------------------------------------------------------------------------
	$('#prev_day').click(function() {
		today = new Date($('#rsv_day').val());
		if (disptype == 0) {
			today.setDate(today.getDate()-1);
		} else {
			today.setDate(today.getDate()-7);
		}
		year = today.getFullYear();
		month = today.getMonth() + 1;
		day = today.getDate();
		$('#rsv_day').val(year+'/'+('0'+month).slice(-2)+'/'+('0'+day).slice(-2));
		MainProc();
	});
	//------------------------------------------------------------------------------------------------------------
	//　翌日（週）ボタンクリック
	//------------------------------------------------------------------------------------------------------------
	$('#next_day').click(function() {
		today = new Date($('#rsv_day').val());
		if (disptype == 0) {
			today.setDate(today.getDate()+1);
		} else {
			today.setDate(today.getDate()+7);
		}
		year = today.getFullYear();
		month = today.getMonth() + 1;
		day = today.getDate();
		$('#rsv_day').val(year+'/'+('0'+month).slice(-2)+'/'+('0'+day).slice(-2));
		MainProc();
	});
	//------------------------------------------------------------------------------------------------------------
	//　新規登録ボタンクリック
	//------------------------------------------------------------------------------------------------------------
	$('#newreg').click(function() {
		DataToDlg(null,0,$('#rsv_day').val(),0,4);
		//登録画面を開く
		$( '#RsvForm' ).dialog( 'open' );
	});
	//------------------------------------------------------------------------------------------------------------
	//　日にちヘッダーをクリック（週表示のみ有効）
	//------------------------------------------------------------------------------------------------------------
	$(document).on('click','.colheader',function(e) {
		if (disptype == 1) {
			$('input[name=disp_dayweek]:eq(0)').prop('checked', true);
			disptype = 0;
			$('#rsv_day').val($(this).data('sdate'));
			$('#rsv_day').trigger('change');
		}
	});
	//------------------------------------------------------------------------------------------------------------
	//　登録データをクリック
	//------------------------------------------------------------------------------------------------------------
	$(document).on('click','.data_waku',function(e) {
		if ($(this).data('ip') == ip || $(this).data('shain_cd') == shain_cd) {
			DataToDlg($(this),$(this).data('kaigi_no'),$(this).data('rsv_day'),$(this).data('stime'),$(this).data('etime'));
			$( '#RsvForm' ).dialog( 'open' );
		}
	});
	//------------------------------------------------------------------------------------------------------------
	//　時間変更時（登録ダイアログ）
	//------------------------------------------------------------------------------------------------------------
	$('#stime').change(function(){
		if (parseInt($('#stime').val())+parseInt($('#wtime').val()) >= ix2time.length) {
			$('#etime').val(ix2time.length-1);
		}
		else {
			$('#etime').val(parseInt($('#stime').val())+parseInt($('#wtime').val()));
		}
	});
	$('#etime').change(function(){
		if (parseInt($('#stime').val())>=parseInt($('#etime').val())) {
			if (parseInt($('#etime').val())-parseInt($('#wtime').val()) >= 0) {
				$('#stime').val(parseInt($('#etime').val())-parseInt($('#wtime').val()));
			}
		}
	});
	//------------------------------------------------------------------------------------------------------------
	//　吹き出しを強制表示
	//------------------------------------------------------------------------------------------------------------
	$(document).on('mouseover','.data_waku',function() {
		$(this).tooltip({ content: $(this).attr('title')});
		$(this).tooltip('open');
	});
	//------------------------------------------------------------------------------------------------------------
	//　マウスオーバーの処理
	//------------------------------------------------------------------------------------------------------------
	// $(document).ready(function(){
	// 	simple_tooltip("span","tooltip");
	// });
});
//------------------------------------------------------------------------------------------------------------
//　メイン制御
//------------------------------------------------------------------------------------------------------------
function MainProc() {
	BlockScreen('Loading ...');
	CreateScreen().done(function() {
		DataLoad().done(function() {
		})
		.always(function() {
			CellSelector();
		});
	})
	.always(function() {
		$.unblockUI();
	});
}
//------------------------------------------------------------------------------------------------------------
//　画面作成
//------------------------------------------------------------------------------------------------------------
function CreateScreen() {
	var dfd = $.Deferred();
	var data = { basho_cd: $('#basho').val() };
	CommAjax(3,$.Deferred(),data,'GetKaigi').done(function(ret) {
		if (ret.code = 'OK') {
			var yobi = ['（日）','（月）','（火）','（水）','（木）','（金）','（土）'];
			var rline;
			var html = '';
			var htmlh = '';
			var htmlk = '';
			cellwidth = Math.floor(($('body').width() - 162) / cellcnt[disptype]) - 1;
			var wday = new Date(today.getTime());
			var kcnt = (ret.data == undefined || ret.data.length < 5 ? 5 : ret.data.length);
			$('#kaigi').empty();
			for (var i=0; i<kcnt; i++) {
				if (ret.data != undefined && ret.data.length > i) {
					$('#kaigi').append($('<option>').html(ret.data[i].kaigi_name).val(ret.data[i].kaigi_no));
					htmlk += '<tr><td>'+ret.data[i].kaigi_name+'</td></tr>';
					html += '<tr><td><div class="data_base" id="data_waku'+ret.data[i].kaigi_no+'" data-kaigi_no="'+ret.data[i].kaigi_no+'"></div>';
//					htmlk += '<tr><td><span class="kaigi" data-kaigi_no="'+ret.data[i].kaigi_no+'">'+ret.data[i].kaigi_name+'</span></td></tr>';
				} else {
					htmlk += '<tr><td></td></tr>';
					html += '<tr><td>';
				}
				for (var j=0; j<cellcnt[disptype]; j++) {
					rline = '';
					if ((disptype == 0 && (j+1) % daycol == 0) || (disptype == 1 && (j+1) % weekcol == 0)) {
						if (j != cellcnt[disptype]-1) {
							rline = 'rline2';
						}
						if (i == 0) {
							htmlh += '<div class="colheader '+rline+'" style="width:'+((cellwidth+1)*(disptype == 0 ? daycol : weekcol)-1)+'px;"';
							htmlh += 'data-sdate='+wday.getFullYear()+'/'+('0'+(wday.getMonth() + 1)).slice(-2)+'/'+('0'+wday.getDate()).slice(-2)+'>';
							if (disptype == 0) {
								htmlh += ix2time[j-3];
							} else {
								if (wday.getDay() == 0) {
									htmlh += '<font color="red">';
								} else if (wday.getDay() == 6) {
									htmlh += '<font color="blue">';
								}
								htmlh += (wday.getMonth()+1) + '/' + wday.getDate() + yobi[wday.getDay()];
								if (wday.getDay() == 0 || wday.getDay() == 6) {
									htmlh += '</font>';
								}
								wday.setDate(wday.getDate()+1);
							}
							htmlh += '</div>';
						}
					} else {
						rline = 'rline1';
					}
					if (ret.data != undefined && ret.data.length > i) {
						html += '<div class="cell '+rline+'" style="width:'+cellwidth+'px;" data-ix='+j+'></div>';
					} else {
						html += '<div class="discell '+rline+'" style="width:'+cellwidth+'px;"></div>';
					}
				}
				html += '</td></tr>';
			}
			$('body').height(70*kcnt+300);
			$('#rsvdata').width((cellwidth+1)*cellcnt[disptype]+4);
			$('#room tbody').html(htmlk);
			$('#rsvdata thead th').html(htmlh);
			$('#rsvdata tbody').html(html);
			dfd.resolve();
		} else {
			dfd.reject();
		}
	})
	.fail(function() {
		dfd.reject();
	});
	return dfd.promise();
}
//------------------------------------------------------------------------------------------------------------
// データ読込
//------------------------------------------------------------------------------------------------------------
function DataLoad() {
	var dfd = $.Deferred();
	var data = {
			basho_cd: $('#basho').val(),
			rsv_day: $('#rsv_day').val(),
			disptype: disptype
	}
	CommAjax(3,$.Deferred(),data,'GetData').done(function(ret) {
		if (ret.code == 'OK') {
			$('.data_waku').remove();
			for (var i=0; ret.data != undefined && i<ret.data.length; i++) {
				var wwidth,wleft,wdays;
				if (disptype == 0) {
					wwidth = (time2ix[ret.data[i].etime] - time2ix[ret.data[i].stime]) * (cellwidth+1) - 1;
					wleft = time2ix[ret.data[i].stime] * (cellwidth+1) - 1;
				} else {
					wdays = new Date(ret.data[i].rsv_day) - new Date($('#rsv_day').val());
					wdays = wdays/(1000*60*60*24);
					wwidth = (time2ix[ret.data[i].etime] - time2ix[ret.data[i].stime])/daycol * (cellwidth+1) - 1;
					wleft = time2ix[ret.data[i].stime]/daycol * (cellwidth+1) - 1 + (wdays*(cellwidth+1)*weekcol);
				}
				var html = '<div class="data_waku" style="width:'+wwidth+'px; left:'+wleft+'px;'+
								(ret.data[i].ip == ip || ret.data[i].shain_cd == shain_cd ? 'background: rgba( 0, 0, 255, 0.20 );':'')+'" '+
								'data-kaigi_no="'+ret.data[i].kaigi_no+'"'+
								'data-ip="'+ret.data[i].ip+'" data-shain_cd="'+ret.data[i].shain_cd+'" data-data_no="'+ret.data[i].data_no+'"'+
								'data-rsv_day="'+ret.data[i].rsv_day+'" data-stime="'+time2ix[ret.data[i].stime]+'"'+
								'data-etime="'+time2ix[ret.data[i].etime]+'" data-cmt="'+ret.data[i].cmt+'" data-shain_nm="'+ret.data[i].shain_nm+'" '+
								'title="'+ret.data[i].stime+'～'+ret.data[i].etime+(ret.data[i].cmt == '' ? '':'<br>')+ret.data[i].cmt+
								(ret.data[i].shain_nm == null ? '' : '<br>登録者：'+ret.data[i].shain_nm) + 
								(ret.data[i].tel == '' ? '' : '<br>連絡先：'+ret.data[i].tel) +'<br>'+
								'登録端末：'+ret.data[i].ip+'">';
				if (disptype == 0) {
					html += ret.data[i].stime+'～'+ret.data[i].etime+'<br>'+ret.data[i].cmt+'<br>'+ret.data[i].shain_nm+'<br>'+ret.data[i].tel;
				}
				html += '</div>'
				$('#data_waku'+ret.data[i].kaigi_no).append(html);
			}
			$('.data_waku').show();
			dfd.resolve();
		} else {
			dfd.reject();
		}
	})
	.fail(function() {
		dfd.reject();
	});
	return dfd.promise();
}
//------------------------------------------------------------------------------------------------------------
// 画面の予定の入っていないセルをドラッグ（セレクト）して選択後に新規登録画面を表示する
//------------------------------------------------------------------------------------------------------------
function CellSelector() {
	var sel_str;
	var sel_end;
	$('#rsvdata > tbody > tr').each(function() {
		$(this).selectable({
			filter: '.cell',
			distance: 10,
			//セレクト開始
			start: function() {
				syoriflg = true;
				sel_str = -1;
				sel_end = -1;
			},
			//セレクト終了
			selected: function(e, ui) {
				if (sel_str == -1) {
					sel_str = $(ui.selected).data('ix');
				}
				sel_end = $(ui.selected).data('ix');
			},
			//終了
			stop: function() {
				if (sel_str != -1 && sel_end != -1) {
					var wday = $('#rsv_day').val();
					if (disptype == 1) {
						if (parseInt(sel_str/weekcol) != parseInt(sel_end/weekcol)) {
							sel_end = sel_str;
						}
						if (parseInt(sel_str/weekcol) > 0) {
							wday = new Date($('#rsv_day').val());
							wday.setDate(wday.getDate() + parseInt(sel_str/weekcol));
							wday = wday.getFullYear()+'/'+('0'+(wday.getMonth()+1)).slice(-2)+'/'+('0'+wday.getDate()).slice(-2);
						}
						sel_str = sel_str % weekcol * daycol;
						sel_end = sel_end % weekcol * daycol + daycol-1;
					}
					DataToDlg(null,$(this).find('.data_base').data('kaigi_no'),wday,sel_str,sel_end+1);
					//登録画面を開く
					$( '#RsvForm' ).dialog( 'open' );
				}
			}
		});
	});
}
//------------------------------------------------------------------------------------------------------------
//　データを登録ダイアログへ表示
//------------------------------------------------------------------------------------------------------------
function DataToDlg(item,kaigi_no,rday,stime,etime) {
	svItem = item;
	if (kaigi_no >= 0) {
		$('#kaigi').val(kaigi_no);
	}
	$('#rday').val(rday);
	$('#stime').val(stime);
	$('#etime').val(etime);
	$('#wtime').val(etime-stime);
	if (item == null) {
		$('#data_no').val(0);
		$('#cmt').val('');
		$('#shain_nm').html(shain_nm);
		$('#ip').html(ip);
	} else {
		$('#data_no').val(item.data('data_no'));
		$('#cmt').val(item.data('cmt'));
		$('#shain_nm').html(item.data('shain_nm'));
		$('#ip').html(item.data('ip'));
	}
}
//------------------------------------------------------------------------------------------------------------
//　ダイアログ設定
//------------------------------------------------------------------------------------------------------------
function DialogSetting() {
	$( '#LoginForm' ).dialog({
		autoOpen: false,
		height: 250,
		width: 350,
		modal: true,
		buttons: {
			'ＯＫ': function() {
				if (shain_cd == '') {
					alert('社員ＣＤを入力して下さい');
					return false;
				}
				$('#LoginForm').dialog( 'close' );
				$('#shain_nm').html(shain_nm);
				$( '#RsvForm' ).dialog( 'open' );
			},
			'キャンセル': function() {
				$('#LoginForm').dialog( 'close' );
			}
		}
	});
	$('#query_shain').click(function() {
		if ($('#l_shain_cd').val() == '') {
			alert('社員ＣＤを入力して下さい');
			$('#l_shain_cd').focus();
		}
		var data = { shain_cd: $('#l_shain_cd').val() };
		CommAjax(3,$.Deferred(),data,'QueryShain').done(function(ret) {
			if (ret.code == 'OK') {
				if (ret.shain_cd != '') {
					$('#l_shain_nm').html(ret.shain_nm);
					shain_cd = ret.shain_cd;
					shain_nm = ret.shain_nm;
				} else {
					alert('社員ＣＤを正しく入力して下さい');
					$('#l_shain_cd').focus();
				}
			}
		});
	});
	$( '#RegKaigiForm' ).dialog({
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			'登録': function() {
				var i = 0;
				var data = { data:[] };
				while ($('#kaigi_no'+i).html() != undefined) {
					if ($('#kaigi_no'+i).html() != '新規' && $('#kaigi_name'+i).val() == '') {
						alert('会議室名を入力して下さい');
						return false;
					}
					data.data.push({ 
									basho_cd: $('#basho').val(),
									kaigi_no: $('#kaigi_no'+i).html(),
									kaigi_name: $('#kaigi_name'+i).val(),
									del_flg: $('#del_flg'+i).prop('checked') ? '1' : '0'
								});
					i++;
				}
				CommAjax(3,$.Deferred(),data,'RegKaigi').done(function(ret) {
					if (ret.code = 'OK') {
						MainProc();
					}
				});
				$('#RegKaigiForm').dialog( 'close' );
			},
			'キャンセル': function() {
				$('#RegKaigiForm').dialog( 'close' );
			}
		},
		open: function() {
			var data = { basho_cd: $('#basho').val() };
			CommAjax(3,$.Deferred(),data,'GetKaigi').done(function(ret) {
				var html = '';
				var i = 0;
				if (ret.code == "OK") {
					for (i=0; ret.data != undefined && i<ret.data.length; i++) {
						html += '<tr><td class="kaigi_no" id="kaigi_no'+i+'">'+ret.data[i].kaigi_no+'</td><td class="kaigi_name">'+
									'<input type="text" class="kaigi_name" id="kaigi_name'+i+'" value="'+ret.data[i].kaigi_name+
										'"></td><td class="kaigi_del"><input type="checkbox" id="del_flg'+i+'"></td></tr>';
					}
				}
				html += '<tr><td class="kaigi_no" id="kaigi_no'+i+'">新規</td><td><input type="text" class="kaigi_name" id="kaigi_name'+i+ 
								'"></td><td class="kaigi_del"> </td></tr>';
				$('#kaigi_table_body').html(html);
				$('#kaigi_no0').focus();	//Jqueryのバグなのかフォーカスをないと正常に動作しない（ＩＥ）
			});
		}
	});
	$( '#RsvForm' ).dialog({
		autoOpen: false,
		height: ie ? 360 : 385,
		width: 370,
		modal: true,
		buttons: {
			'削除': function() {
				if (svItem != null && confirm('削除します。よろしいですか？')) {
					var data = { 
										basho_cd: $('#basho').val(),
										kaigi_no: $('#kaigi').val(),
										data_no: $('#data_no').val(),
									};
					CommAjax(3,$.Deferred(),data,'DelData').done(function(ret) {
						if (ret.code = 'OK') {
							$('#RsvForm').dialog( 'close' );
							DataLoad();
						}
					});
				}
			},
			'登録': function() {
				if (new Date($('#rday').val() + ' 23:59') < new Date()) {
					alert('過去の登録はできません');
					return false;
				}
				var wdays =  new Date($('#rday').val()) - new Date();
				wdays = wdays/(1000*60*60*24);
				if (wdays > 60) {
					alert('登録日は60日以内です。');
					return false;
				}
				if (parseInt($('#stime').val()) >= parseInt($('#etime').val())) {
					alert('予約時間に誤りがあります');
					return false;
				}
				var data = { 
									basho_cd: $('#basho').val(),
									kaigi_no: $('#kaigi').val(),
									data_no: $('#data_no').val(),
									rsv_day: $('#rday').val(),
									stime: ix2time[$('#stime').val()],
									etime: ix2time[$('#etime').val()],
									cmt: $('#cmt').val(),
									shain_cd: shain_cd
								};
				CommAjax(3,$.Deferred(),data,'RegData').done(function(ret) {
					if (ret.code = 'OK') {
						$('#RsvForm').dialog( 'close' );
						DataLoad();
					}
				})
				.fail(function() {
					DataLoad();
				});
			},
			'キャンセル': function() {
				$('#RsvForm').dialog( 'close' );
			}
		},
		open: function() {
			if (shain_cd == '') {
				$('#RsvForm').dialog( 'close' );
				$( '#LoginForm' ).dialog( 'open' );
			}
		}
	});
	$('.ui-dialog-buttonpane button:contains("削除")').css('margin-right','115px');
}
//------------------------------------------------------------------------------------------------------------
//　ajax通信
//------------------------------------------------------------------------------------------------------------
function CommAjax(RetryCnt,dfd,idata,app) {
	$.ajax({
		type: 'post',
		url: 'rsv.php?func='+app,
		dataType: 'json', 
		data: idata
	})
	.done(function(data) {
		//通信正常終了
		if (data.code == 'OK') {
			dfd.resolve(data);
		}
		else {
			alert(data.msg);
			dfd.reject(data);
		}
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		//通信エラー時にリトライをかける
		if (textStatus == 'timeout' && RetryCnt > 0) {
			RetryCnt--;
			setTimeout(function(){SendAjax(RetryCnt,dfd,idata,app);}, 200 );
		}
		else {
			alert(((debug == 1) ? jqXHR.responseText : 'エラーが発生しました。タイムアウト'));
			data = {code:'TimeOut'};
			dfd.reject(data);
		}
	});
	return dfd.promise();
}
//------------------------------------------------------------------------------------------------------------
// 画面操作を無効（Now loadingなどのメッセージを表示）
//------------------------------------------------------------------------------------------------------------                
function BlockScreen( scrmsg ) {
	$.blockUI({
		message: scrmsg,
		css: {
			border: 'none',
			opacity: 0.6,
		},
		overlayCSS: {
			backgroundColor: '#000',
			opacity: 0.1
		}
	});
}
//------------------------------------------------------------------------------------------------------------
// マウスオーバーで画像を出したい
//------------------------------------------------------------------------------------------------------------                
function simple_tooltip(target_items, name){
	$(target_items).each(function(i){
		$("body").append("<div class='"+name+"' id='"+name+i+"'><p>"+$(this).attr('title')+"</p></div>");
		var my_tooltip = $("#"+name+i);
		if($(this).attr("title") != "" && $(this).attr("title") != "undefined" ){
			$(this).removeAttr("title").mouseover(function(){
				my_tooltip.css({opacity:1, display:"none"}).fadeIn(400);
			}).mousemove(function(kmouse){
				var border_top = $(window).scrollTop();
				var border_right = $(window).width();
				var left_pos;
				var top_pos;
				var offset = 20;
				if(border_right - (offset *2) >= my_tooltip.width() + kmouse.pageX){
					left_pos = kmouse.pageX+offset;
				} else{
					left_pos = border_right-my_tooltip.width()-offset;
				}

				if(border_top + (offset *2)>= kmouse.pageY - my_tooltip.height()){
					top_pos = border_top +offset;
				} else{
					top_pos = kmouse.pageY-my_tooltip.height()-offset;
				}
				my_tooltip.css({left:left_pos, top:top_pos});
			}).mouseout(function(){
				my_tooltip.css({left:"-9999px"});
			});
		}
	});
}
