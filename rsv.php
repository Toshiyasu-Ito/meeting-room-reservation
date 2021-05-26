<?php
session_start();
if (!isset($_GET["func"])) exit;
$_GET["func"]();    //各ファンクションのコール
//------------------------------------------------------------------------------------------------------------
// 初期処理
//------------------------------------------------------------------------------------------------------------
function Init() {
	try {
		$shain_cd = "";
		$shain_nm = "";
		if (isset($_SESSION["ses_login"]["shain_cd"]) || isset($_SESSION["kaigi_shain_cd"])) {
			require_once $_SERVER["DOCUMENT_ROOT"] ."/php/common/scripts/mycon.php";	
			$conn = myopen2("localhost","cki01","8848cki01","keijiban");
			if ($conn) {
				if (isset($_SESSION["ses_login"]["shain_cd"])) {
					$sql = "SELECT syaincd,name as shain_nm FROM syain_v 
								WHERE syaincd = '{$_SESSION["ses_login"]["shain_cd"]}'";
				} else {
					$sql = "SELECT syaincd,name as shain_nm FROM syain_v 
								WHERE syaincd = '{$_SESSION["kaigi_shain_cd"]}'";
				}
				$result = mysql_query($sql) or die($sql);    
				if ($row = mysql_fetch_array($result)) {
					$shain_cd = $row["syaincd"];
					$shain_nm = $row["shain_nm"];
				}
			}
		}
		$ret = array(
			"code" => "OK",
			"ip" => $_SERVER["REMOTE_ADDR"],
			"shain_cd" => $shain_cd,
			"shain_nm" => $shain_nm,
			"admin" => isset($_SESSION["ses_login"]["stf_flg"]) && $_SESSION["ses_login"]["stf_flg"] == "0" ? true : false
		);
	}
	catch (Exception $e) {
		$ret = array("code"=>"ERROR","msg"=>$e);
	}
	echo json_encode($ret);
}
//------------------------------------------------------------------------------------------------------------
// 社員ＣＤ問合せ
//------------------------------------------------------------------------------------------------------------
function QueryShain() {
	require_once $_SERVER["DOCUMENT_ROOT"] ."/php/common/scripts/mycon.php";
	try {
		$conn = myopen2("localhost","cki01","8848cki01","keijiban");
		if ($conn) {
			$sql = "SELECT syaincd,name FROM syain_v WHERE syaincd = '{$_POST["shain_cd"]}'";
			$result = mysql_query($sql) or die($sql);    
			if ($row = mysql_fetch_array($result)) {
				$ret = array(
								"code" => "OK",
								"shain_cd" => $row["syaincd"],
								"shain_nm" => $row["name"]
								);
				$_SESSION["kaigi_shain_cd"] = $row["syaincd"];
			}
			else {
				$ret = array("code"=>"OK", "shain_cd" => "");
			}
		} else {
			throw new Exception("MySQLオープンエラー");
		}
	}
	catch (Exception $e) {
		$ret = array("code"=>"ERROR","msg"=>$e);
	}
	echo json_encode($ret);
}
//------------------------------------------------------------------------------------------------------------
// 会議室データ読込
//------------------------------------------------------------------------------------------------------------
function GetKaigi() {
	require_once $_SERVER["DOCUMENT_ROOT"] ."/php/common/scripts/mycon.php";
	try {
		$conn = myopen2("localhost","cki01","8848cki01","keijiban");
		if ($conn) {
			$ret["code"] = "OK";
			$sql = "SELECT kaigi_no,kaigi_name FROM kaigi_t 
						WHERE basho_cd = {$_POST["basho_cd"]} ORDER BY kaigi_no";
			$result = mysql_query($sql) or die($sql);    
			while ($row = mysql_fetch_array($result)) {
				$ret["data"][] = array(
											"kaigi_no" => $row["kaigi_no"],
											"kaigi_name" => $row["kaigi_name"]
										);
			}
		} else {
			throw new Exception("MySQLオープンエラー");
		}
	}
	catch (Exception $e) {
		$ret = array("code"=>"ERROR","msg"=>$e);
	}
	echo json_encode($ret);
}
//------------------------------------------------------------------------------------------------------------
// 会議室データ書込
//------------------------------------------------------------------------------------------------------------
function RegKaigi() {
	try {
		if (!isset($_SESSION["ses_login"]["stf_flg"]) || $_SESSION["ses_login"]["stf_flg"] != "0") {
			throw new Exception("ログインしなおして下さい");
		}
		require_once $_SERVER["DOCUMENT_ROOT"] ."/php/common/scripts/mycon.php";
		$conn = myopen2("localhost","cki01","8848cki01","keijiban");
		if ($conn) {
			for ($i=0; $i<count($_POST["data"]); $i++) {
				if ($_POST["data"][$i]["kaigi_no"] == "新規") {
					if (trim($_POST["data"][$i]["kaigi_name"]) != "") {
						$sql = "SELECT ifnull(max(kaigi_no),0)+1 as maxno 
									FROM kaigi_t 
									WHERE basho_cd = ".$_POST["data"][$i]["basho_cd"];
						$result = mysql_query($sql) or die($sql);    
						$row = mysql_fetch_array($result);
						$sql = "INSERT INTO kaigi_t values(
										{$_POST["data"][$i]["basho_cd"]},
										{$row["maxno"]},
										'{$_POST["data"][$i]["kaigi_name"]}'
									)";
					}
				} elseif ($_POST["data"][$i]["del_flg"] == "1") {
					$sql = "SELECT stime FROM kaigi_mei_t 
								WHERE kaigi_no = {$_POST["data"][$i]["kaigi_no"]}
									AND basho_cd = {$_POST["data"][$i]["basho_cd"]}
									AND rsv_day >= '".date("Y-m-d")."'";
					$result = mysql_query($sql) or die($sql);    
					if ($row = mysql_fetch_array($result)) {
						throw new Exception($_POST["data"][$i]["kaigi_name"]."は予定が入っている為、削除できません");
					}
					$sql = "DELETE FROM kaigi_t 
								WHERE kaigi_no = {$_POST["data"][$i]["kaigi_no"]}
									AND basho_cd = {$_POST["data"][$i]["basho_cd"]}";
				} else {
					$sql = "UPDATE kaigi_t SET 	kaigi_name = '{$_POST["data"][$i]["kaigi_name"]}'
								WHERE kaigi_no = {$_POST["data"][$i]["kaigi_no"]} 
									AND basho_cd = {$_POST["data"][$i]["basho_cd"]}";
				}
				if ($sql != "") {
					if (!(mysql_query($sql) or die($sql))) throw new Exception("登録エラー");
				}
			}
			$ret["code"] = "OK";
		} else {
			throw new Exception("MySQLオープンエラー");
		}
	}
	catch (Exception $e) {
		$ret = array("code"=>"ERROR","msg"=>$e->getMessage());
	}
	echo json_encode($ret);
}
//------------------------------------------------------------------------------------------------------------
// 予約データ読込
//------------------------------------------------------------------------------------------------------------
function GetData() {
	require_once $_SERVER["DOCUMENT_ROOT"] ."/php/common/scripts/mycon.php";
	try {
		$conn = myopen2("localhost","cki01","8848cki01","keijiban");
		if ($conn) {
			$ret["code"] = "OK";
			$sql = "SELECT 
								kaigi_no,
								data_no,
								rsv_day,
								stime,
								etime,
								cmt,ip,
								shain_cd,
								syain_v.
								name as shain_nm,
								EMP_TELNO as tel 
						FROM kaigi_mei_t 
							LEFT JOIN syain_v ON syain_v.syaincd = kaigi_mei_t.shain_cd
							LEFT JOIN common.Employee_Tel ON Employee_Tel.EMP_ID = kaigi_mei_t.shain_cd
						WHERE basho_cd = {$_POST["basho_cd"]}";
			if ($_POST["disptype"] == "0") {
				$sql .= " AND rsv_day = '{$_POST["rsv_day"]}'";
			} else {
				$sql .= " AND rsv_day BETWEEN '{$_POST["rsv_day"]}' AND '".date("Y/m/d",strtotime($_POST["rsv_day"]." +6 Days"))."'";
			}
			$result = mysql_query($sql) or die($sql);    
			while ($row = mysql_fetch_array($result)) {
				$ret["data"][] = array(
										"kaigi_no" => $row["kaigi_no"],
										"data_no" => $row["data_no"],
										"rsv_day" => str_replace("-","/",$row["rsv_day"]),
										"stime" => substr($row["stime"],0,5),
										"etime" => substr($row["etime"],0,5),
										"cmt" => $row["cmt"],
										"ip" => $row["ip"],
										"shain_cd" => $row["shain_cd"],
										"shain_nm" => $row["shain_nm"],
										"tel" => ($row["tel"] == "" ? "":$row["tel"]),
									);
			}
		} else {
			throw new Exception("MySQLオープンエラー");
		}
	}
	catch (Exception $e) {
		$ret = array("code"=>"ERROR","msg"=>$e);
	}
	echo json_encode($ret);
}
//------------------------------------------------------------------------------------------------------------
// 予約データ登録
//------------------------------------------------------------------------------------------------------------
function RegData() {
	require_once $_SERVER["DOCUMENT_ROOT"] ."/php/common/scripts/mycon.php";	
	try {
		$conn = myopen2("localhost","cki01","8848cki01","keijiban");
		if ($conn) {
			$sql = "SELECT data_no FROM kaigi_mei_t 
							WHERE data_no <> ".$_POST["data_no"]."
								AND kaigi_no = ".$_POST["kaigi_no"]."
								AND basho_cd = ".$_POST["basho_cd"]."
								AND rsv_day = '".$_POST["rsv_day"]."'
								AND etime > '".$_POST["stime"]."'
								AND stime < '".$_POST["etime"]."'";
			$result = mysql_query($sql) or die($sql);    
			if ($row = mysql_fetch_array($result)) {
				throw new Exception("データ登録エラー（データが重複してます)");
			}
			if ($_POST["data_no"] == "0") {
				$sql = "SELECT ifnull(max(data_no),0)+1 as maxno FROM kaigi_mei_t 
								WHERE basho_cd = {$_POST["basho_cd"]} AND kaigi_no = {$_POST["kaigi_no"]}";
				$result = mysql_query($sql) or die($sql);    
				$row = mysql_fetch_array($result);
				$sql = "INSERT INTO kaigi_mei_t (
								basho_cd,
								kaigi_no,
								data_no,
								rsv_day,
								stime,
								etime,
								cmt,
								ip,
								shain_cd
							) values(
								{$_POST["basho_cd"]},
								{$_POST["kaigi_no"]},
								{$row["maxno"]},
								'{$_POST["rsv_day"]}',
								'{$_POST["stime"]}',
								'{$_POST["etime"]}',
								'".mysql_real_escape_string($_POST["cmt"])."',
								'{$_SERVER["REMOTE_ADDR"]}',
								'{$_POST["shain_cd"]}')";
			} else {
				$sql = "UPDATE kaigi_mei_t SET 
								rsv_day = '{$_POST["rsv_day"]}',
								stime = '{$_POST["stime"]}',
								etime = '{$_POST["etime"]}',
								cmt = '".mysql_real_escape_string($_POST["cmt"])."',
								shain_cd = '{$_POST["shain_cd"]}',
								ip = '{$_SERVER["REMOTE_ADDR"]}'
							WHERE data_no = {$_POST["data_no"]}
								AND kaigi_no = {$_POST["kaigi_no"]}
								AND basho_cd = {$_POST["basho_cd"]}";
			}
			if (!(mysql_query($sql) or die($sql))) throw new Exception("登録エラー");
			$ret["code"] = "OK";
		} else {
			throw new Exception("MySQLオープンエラー");
		}
	}
	catch (Exception $e) {
		$ret = array("code"=>"ERROR","msg"=>$e->getMessage());
	}
	echo json_encode($ret);
}
//------------------------------------------------------------------------------------------------------------
// 予約データ削除
//------------------------------------------------------------------------------------------------------------
function DelData() {
	require_once $_SERVER["DOCUMENT_ROOT"] ."/php/common/scripts/mycon.php";	
	try {
		$conn = myopen2("localhost","cki01","8848cki01","keijiban");
		if ($conn) {
			$sql = "DELETE FROM kaigi_mei_t
						WHERE data_no = ".$_POST["data_no"]." AND kaigi_no = ".$_POST["kaigi_no"]. " AND basho_cd = ".$_POST["basho_cd"];
			if (!(mysql_query($sql) or die($sql))) throw new Exception("削除エラー");
			$ret["code"] = "OK";
		} else {
			throw new Exception("MySQLオープンエラー");
		}
	}
	catch (Exception $e) {
		$ret = array("code"=>"ERROR","msg"=>$e->getMessage());
	}
	echo json_encode($ret);
}
?>