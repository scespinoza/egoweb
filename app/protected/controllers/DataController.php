<?php

class DataController extends Controller
{


    /**
     * @return array action filters
     */
    public function filters()
    {
        return array(
            'accessControl', // perform access control for CRUD operations
            //'postOnly + delete', // we only allow deletion via POST request
        );
    }

    /**
     * Specifies the access control rules.
     * This method is used by the 'accessControl' filter.
     * @return array access control rules
     */
    public function accessRules()
    {
        return array(
            array('allow', // allow authenticated user to perform 'create' and 'update' actions
                //'actions'=>array('*'),//'index', 'exportegoalterall', 'savenote', 'noteexists','exportalterpair', 'exportalterpairall', 'exportalterlist', 'exportother', 'visualize', 'study', 'ajaxAdjacencies', 'exportegoalter' , "savematch" , "unmatch", "edit"),
                'users'=>array('@'),
            ),
            array('deny',  // deny all users
                'users'=>array('*'),
            ),
        );
    }

    public function actionEdit($id)
    {
        $interview = Interview::model()->findByPk(array("id"=>$id));
        $interview->completed = 0;
        $interview->save();
        Yii::app()->request->redirect(Yii::app()->request->urlReferrer);
    }

    public function actionStudy($id)
    {
        $criteria = new CDbCriteria;
        $criteria = array(
            'condition'=>"studyId = $id and useAlterListField in ('name','email','id')",
        );
        $egoIdQ = Question::model()->find($criteria);
        $restrictions = "";
        if ($egoIdQ) {
            $criteria = new CDbCriteria;
            $criteria = array(
                'condition'=>"interviewerId = " . Yii::app()->user->id,
            );
            $participantList =  AlterList::model()->findAll($criteria);
            $participants = array();
            foreach ($participantList as $p) {
                if ($egoIdQ->useAlterListField == "email") {
                    $participants[] = $p->email;
                } elseif ($egoIdQ->useAlterListField == "name") {
                    $participants[] = $p->name;
                }
            }
            if ($participants) {
                $criteria = array(
                    'condition'=>"questionId = " .$egoIdQ->id,
                );
                $answers = Answer::model()->findAll($criteria);
                foreach ($answers as $answer) {
                    if (in_array($answer->value, $participants)) {
                        $interviewIds[] = $answer->interviewId;
                    }
                }
                if ($interviewIds) {
                    $restrictions = ' and id in (' . implode(",", $interviewIds) . ')';
                } else {
                    $restrictions = ' and id = -1';
                }
            }
        }
        if (Yii::app()->user->isSuperAdmin) {
            $restrictions = "";
        }
        $criteria=array(
            'condition'=>'studyId = '.$id . $restrictions,
            'order'=>'id DESC',
        );
        $count=Interview::model()->count($criteria);
        $pages = new CPagination($count);
        $pages->pageSize=500;
        $pages->applyLimit($criteria);
        $criteria=array(
            'condition'=>'studyId = '.$id . $restrictions,
            'order'=>'id DESC',
            'offset'=>            $pages->getOffset(),
            'limit'=>$pages->getLimit(),

        );
        $interviews = Interview::model()->findAll($criteria);

        $study = Study::model()->findByPk((int)$id);

        $questionIds = array();
        $questions = Question::model()->findAllByAttributes(array("subjectType"=>"ALTER_PAIR", "studyId"=>$id));
        foreach ($questions as $question) {
            $questionIds[] = $question->id;
        }
        $expressions = array();
        if (count($questionIds) > 0) {
            $questionIds = implode(",", $questionIds);
            $criteria = array(
                'condition'=>"studyId = " . $study->id ." AND questionId in ($questionIds)",
            );
            $expressions = CHtml::listData(
                Expression::model()->findAll($criteria),
                'id',
                function ($post) {
                    return CHtml::encode(substr($post->name, 0, 40));
                }
            );
        }
        $this->render('study', array(
            'study'=>$study,
            'interviews'=>$interviews,
            'expressions'=>$expressions,
            'pages'=>$pages,
        ));
    }

    public function actionVisualize()
    {
        $graphs = array();
        if (isset($_GET['interviewId'])) {
            $interview = Interview::model()->findByPK($_GET['interviewId']);
            $studyId = $interview->studyId;
            if (!$studyId) {
                echo "No studyId found for interviewId = ".$_GET['interviewId'];
                return;
            }
            $criteria = array(
                'condition'=>"subjectType = 'ALTER_PAIR' AND studyId = $studyId",
            );
            $questions = Question::model()->findAll($criteria);
            $questionIds = array();
            foreach ($questions as $question) {
                $questionIds[] = $question->id;
            }
            $questionIds = implode(",", $questionIds);
            if (!$questionIds) {
                $questionIds = 0;
            }
            $criteria = array(
                'condition'=>"studyId = $studyId AND questionId in (" . $questionIds . ")",
            );
            $alter_pair_expression = Expression::model()->findAll($criteria);
            $alter_pair_expression_ids = array();
            foreach ($alter_pair_expression as $expression) {
                $alter_pair_expression_ids[] = $expression->id;
            }
            if (count($alter_pair_expression_ids) < 1) {
                //echo "NO ALTER PAIR EXPRESSION IDS FOUND FOR QUESTION IDS ".(string)$questionIds;
                $alter_pair_expressions = array();
            } else {
                $all_expression_ids = $alter_pair_expression_ids;
                foreach ($alter_pair_expression_ids as $id) {
                    $criteria = array(
                        'condition'=>"FIND_IN_SET($id, value)",
                    );
                    $expressions = Expression::model()->findAll($criteria);
                    foreach ($expressions as $e) {
                        $all_expression_ids[] = $e->id;
                    }
                }
                $criteria = array(
                    'condition'=>"id in (" . implode(",", $all_expression_ids) . ")",
                );
                $alter_pair_expressions = Expression::model()->findAll($criteria);
            }

            if (isset($_GET['print'])) {
                $this->renderPartial(
                    'print',
                    array(
                        'graphs'=>$graphs,
                        'studyId'=>$studyId,
                        'alter_pair_expressions'=> $alter_pair_expressions,
                        'interviewId'=>$_GET['interviewId'],
                    ),
                    false,
                    true
                );
            } else {
                $this->render(
                    'visualize',
                    array(
                        'graphs'=>$graphs,
                        'studyId'=>$studyId,
                        'alter_pair_expressions'=> $alter_pair_expressions,
                        'interviewId'=>$_GET['interviewId'],
                    )
                );
            }
        }
    }

    public function actionMatching()
    {
        if (count($_POST['export']) < 2) {
            die("You must select at least 2 interviews");
        }

        foreach ($_POST['export'] as $key=>$value) {
            $interviewIds[] = $key;
        }
        arsort($interviewIds);
        $interview1 = Interview::model()->findByPK($interviewIds[0]);
        $interview2 = Interview::model()->findByPK($interviewIds[1]);
        $study = Study::model()->findByPk($interview1->studyId);
        $criteria = array(
            'condition'=>"FIND_IN_SET(" . $interview1->id . ", interviewId)",
        );
        $result = Alters::model()->findAll($criteria);
        foreach ($result as $alter) {
            $alters1[$alter->id] = $alter->name;
        }
        $criteria = array(
            'condition'=>"FIND_IN_SET(" . $interview2->id . ", interviewId)",
        );
        $result = Alters::model()->findAll($criteria);


        foreach ($result as $alter) {
            $alters2[$alter->id] = $alter->name;
        }
        $criteria = array(
            'condition'=>"questionType = 'ALTER' AND interviewId in (" . $interview1->id . ", " . $interview2->id  . ")",
        );
        $result = Answer::model()->findAll($criteria);
        foreach ($result as $answer) {
            if ($answer->answerType == "MULTIPLE_SELECTION") {
                $optionIds = explode(",", $answer->value);
                //$answer->value = "";
                $answerArray = array();
                $otherSpecifies = array();
                $response = $answer->otherSpecifyText;
                foreach (preg_split('/;;/', $response) as $otherSpecify) {
                    if (strstr($otherSpecify, ':')) {
                        list($optionId, $val) = preg_split('/:/', $otherSpecify);
                        $otherSpecifies[$optionId] = $val;
                    }
                }
                $optionIds = explode(",", $answer->value);
                foreach ($optionIds as $optionId) {
                    if (!$optionId) {
                        continue;
                    }
                    $option = QuestionOption::model()->findbyPk($optionId);
                    if (isset($otherSpecifies[$optionId])) {
                        //if(count($optionIds) == 1 && preg_match("/OTHER \(*SPECIFY\)*/i", $other_options[$optionId]->name))
                        $answerArray[] = $otherSpecifies[$optionId];
                    //else
                            //    $answerArray[] = $otherSpecifies[$optionId];
                    } else {
                        $answerArray[] = $option->name;
                    }
                }
                /*
                foreach  ($optionIds as $optionId)
                {
                    $option = QuestionOption::model()->findbyPk($optionId);
                    if ($option)
                    {
                        $criteria=new CDbCriteria;
                        $criteria=array(
                            'condition'=>"optionId = " . $option->id . " AND interviewId in (".$answer->interviewId.")",
                        );
                        $otherSpecify = OtherSpecify::model()->find($criteria);
                        if ($otherSpecify)
                            $answerArray[] = $option->name . " (\"" . $otherSpecify->value . "\")";
                        else
                            $answerArray[] = $option->name;
                    }
                }*/
                $answer->value = implode("; ", $answerArray);
            }
            $answers[$answer->questionId][$answer->alterId1] = $answer->value;
        }

        $result = Question::model()->findAllByAttributes(array("subjectType"=>"ALTER", "studyId"=>$interview1->studyId));
        foreach ($result as $question) {
            $questions[$question->id] = $question->title;
            $prompts[$question->id] = $question->prompt;
        }
        $this->render('matching', array(
            'interview1'=>$interview1,
            'alters1'=>$alters1,
            'interview2'=>$interview2,
            'alters2'=>$alters2,
            'answers'=>$answers,
            'questions'=>$questions,
            'prompts'=>$prompts,
            'study'=>$study
        ));
    }

    public function actionExportmatches()
    {
        $interviewIds = explode(",", $_GET['interviewIds']);
        $study = Study::model()->findByPk($_GET['studyId']);
        $file = fopen(getcwd() . "/assets/" . $study->id . "-matched-alters.csv", "w") or die("Unable to open file!");

        $headers = array();
        $headers[] = 'Interview Ego ID';
        $headers[] = "Alter Name";
        $headers[] = "Alter Match Id";

        fputcsv($file, $headers);
        foreach ($interviewIds as $interviewId) {
            $alters = Alters::model()->findAllByAttributes(array("interviewId"=>$interviewId));
            $egoId = Interview::getEgoId($interviewId);
            foreach ($alters as $alter) {
                $criteria = array(
                    'condition'=>"alterId1 = $alter->id OR alterId2 = $alter->id",
                );
                $matchId = "";
                $match = MatchedAlters::model()->find($criteria);
                if ($match) {
                    $matchId = $match->id;
                }
                fputcsv($file, array($egoId,$alter->name,$matchId));
            }
        }

        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=".seoString($study->name)."-matched-alters-data".".csv");
        header("Content-Type: application/force-download");

        $filePath = getcwd() . "/assets/" . $study->id. "-matched-alters.csv";
        if (file_exists($filePath)) {
            echo file_get_contents($filePath);
            unlink($filePath);
        }

        Yii::app()->end();
    }

    public function actionUnmatch()
    {
        if (isset($_POST)) {
            $match = MatchedAlters::model()->findByAttributes(array("alterId1"=>$_POST['alterId1'], "alterId2"=>$_POST['alterId2']));
            if ($match) {
                $match->delete();
            }
        }
    }

    public function actionIndex()
    {
        $condition = "id != 0";
        if (!Yii::app()->user->isSuperAdmin) {
            #OK FOR SQL INJECTION
            if (Yii::app()->user->id) {
                $criteria = array(
                    'condition'=>"interviewerId = " . Yii::app()->user->id,
                );
                $interviewers = Interviewer::model()->findAll($criteria);
                $studies = array();
                foreach ($interviewers as $i) {
                    $studies[] = $i->studyId;
                }
            } else {
                $studies = false;
            }
            if ($studies) {
                $condition = "id IN (" . implode(",", $studies) . ")";
            } else {
                $condition = "id = -1";
            }
        }

        $criteria = array(
            'condition'=>$condition,
            'order'=>'id DESC',
        );

        $studies = Study::model()->findAll($condition);

        $this->render('index', array(
            'studies'=>$studies,
        ));
    }

    public function actionExportegoalterall()
    {
        if (!isset($_POST['studyId']) || $_POST['studyId'] == "") {
            die("nothing to export");
        }

        if (isset($_POST['expressionId'])) {
            $expressionId = $_POST['expressionId'];
        } else {
            $expressionId = '';
        }

        $withAlters = false;
        if (isset($_POST['withAlters'])) {
            $withAlters = boolval($_POST['withAlters']);
        }

        $study = Study::model()->findByPk((int)$_POST['studyId']);
        $criteria = array(
            "condition"=>"studyId = " . $study->id,
        );
        $optionsRaw = QuestionOption::model()->findAll($criteria);

        // create an array with option ID as key
        $options = array();
        foreach ($optionsRaw as $option) {
            $options[$option->id] = $option->value;
        }

        // fetch questions
        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'EGO_ID'");
        $criteria->order = "ordering";
        $ego_id_questions = Question::model()->findAll($criteria);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'EGO'");
        $criteria->order = "ordering";
        $ego_questions = Question::model()->findAll($criteria);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'ALTER'");
        $criteria->order = "ordering";
        $alter_questions = Question::model()->findAll($criteria);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'NETWORK'");
        $criteria->order = "ordering";
        $network_questions = Question::model()->findAll($criteria);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'NAME_GENERATOR'");
        $criteria->order = "ordering";
        $name_gen_questions = Question::model()->findAll($criteria);

        $headers = array();
        $headers[] = 'Interview ID';
        $headers[] = "EgoID";
        $headers[] = 'Start Time';
        $headers[] = 'End Time';
        foreach ($ego_id_questions as $question) {
            $headers[] = $question->title;
        }
        foreach ($ego_questions as $question) {
            $headers[] = $question->title;
        }
        foreach ($network_questions as $question) {
            $headers[] = $question->title;
        }
        if ($expressionId) {
            $headers[] = "Density";
            $headers[] = "Max Degree Value";
            $headers[] = "Max Betweenness Value";
            $headers[] = "Max Eigenvector Value";
            $headers[] = "Degree Centralization";
            $headers[] = "Betweenness Centralization";
            $headers[] = "Components";
            $headers[] = "Dyads";
            $headers[] = "Isolates";
        }
        $matchAtAll = MatchedAlters::model()->find(array(
            'condition'=>"studyId = " . $study->id,
        ));
        if ($matchAtAll) {
            $headers[] = "Dyad Match ID";
            $headers[] = "Match User";
            $headers[] = "Alter Number";
            if($withAlters){
                $headers[] = "Alter Name";
                $headers[] = "Matched Alter Name";
            }
            $headers[] = "Alter Pair ID";
        } else {
            $headers[] = "Alter Number";
            if($withAlters)
                $headers[] = "Alter Name";
        }
        foreach ($name_gen_questions as $question) {
            $headers[] = $question->title;
        }
        foreach ($alter_questions as $question) {
            $headers[] = $question->title;
        }
        if ($expressionId) {
            $headers[] = "Degree";
            $headers[] = "Betweenness";
            $headers[] = "Eigenvector";
        }

        $interviewIds = array();
        $interviewIds = explode(",",$_POST['interviewIds']);
        /*
        foreach ($_POST['export'] as $key=>$value) {
            $interviewIds[] = $key;
        }
        */
        // start generating export file
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=".seoString($study->name)."-ego-alter-data".".csv");
        header("Content-Type: application/force-download");
        echo implode(',', $headers) . "\n";
        foreach ($interviewIds as $interviewId) {
            $filePath = getcwd() . "/assets/" . $_POST['studyId'] . "/". $interviewId . "-ego-alter.csv";
            if (file_exists($filePath)) {
                echo file_get_contents($filePath);
                unlink($filePath);
            }
        }
        Yii::app()->end();
    }

    public function actionExportegostudy()
    {
        if (!isset($_POST['studyId'])) {
            die("no study selected");
        }

        $filePath = getcwd()."/assets/".$_POST['studyId'];
        if (file_exists($filePath . "/" . $_POST['interviewId'] . "-ego-level-data.csv")) {
            echo "success";
            Yii::app()->end();
        }

        if (!is_dir($filePath)) {
            mkdir($filePath, 0777, true);
        }

        $withAlters = false;
        if (isset($_POST['withAlters'])) {
            $withAlters = boolval($_POST['withAlters']);
        }

        $interview = Interview::model()->findByPk($_POST['interviewId']);
        if ($interview) {
            $file = fopen($filePath . "/" . $_POST['interviewId'] . "-ego-level-data.csv", "w") or die("Unable to open file!");
            $interview->exportEgoStudy($file);
            echo "success";
            Yii::app()->end();
        }
        echo "fail";
    }

    public function actionExportegostudyall()
    {
        if (!isset($_POST['studyId']) || $_POST['studyId'] == "") {
            die("nothing to export");
        }

        if (isset($_POST['expressionId'])) {
            $expressionId = $_POST['expressionId'];
        } else {
            $expressionId = '';
        }

        $withAlters = false;
        if (isset($_POST['withAlters'])) {
            $withAlters = boolval($_POST['withAlters']);
        }

        $study = Study::model()->findByPk((int)$_POST['studyId']);
        $criteria = array(
            "condition"=>"studyId = " . $study->id,
        );
        $optionsRaw = QuestionOption::model()->findAll($criteria);

        // create an array with option ID as key
        $options = array();
        foreach ($optionsRaw as $option) {
            $options[$option->id] = $option->value;
        }

        // fetch questions
        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'EGO_ID'");
        $criteria->order = "ordering";
        $ego_id_questions = Question::model()->findAll($criteria);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'EGO'");
        $criteria->order = "ordering";
        $ego_questions = Question::model()->findAll($criteria);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'ALTER'");
        $criteria->order = "ordering";
        $alter_questions = Question::model()->findAll($criteria);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'NETWORK'");
        $criteria->order = "ordering";
        $network_questions = Question::model()->findAll($criteria);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'NAME_GENERATOR'");
        $criteria->order = "ordering";
        $name_gen_questions = Question::model()->findAll($criteria);

        $headers = array();
        $headers[] = 'Interview ID';
        $headers[] = "EgoID";
        $headers[] = 'Start Time';
        $headers[] = 'End Time';
        foreach ($ego_id_questions as $question) {
            $headers[] = $question->title;
        }
        foreach ($ego_questions as $question) {
            $headers[] = $question->title;
        }
        foreach ($network_questions as $question) {
            $headers[] = $question->title;
        }
/*
        if ($expressionId) {
            $headers[] = "Density";
            $headers[] = "Max Degree Value";
            $headers[] = "Max Betweenness Value";
            $headers[] = "Max Eigenvector Value";
            $headers[] = "Degree Centralization";
            $headers[] = "Betweenness Centralization";
            $headers[] = "Components";
            $headers[] = "Dyads";
            $headers[] = "Isolates";
        }
        $matchAtAll = MatchedAlters::model()->find(array(
            'condition'=>"studyId = " . $study->id,
        ));
        if ($matchAtAll) {
            $headers[] = "Dyad Match ID";
            $headers[] = "Match User";
            $headers[] = "Alter Number";
                $headers[] = "Alter Name";
                $headers[] = "Matched Alter Name";
            
            $headers[] = "Alter Pair ID";
        } else {
 
        }
        foreach ($name_gen_questions as $question) {
            $headers[] = $question->title;
        }
        foreach ($alter_questions as $question) {
            $headers[] = $question->title;
        }
        if ($expressionId) {
            $headers[] = "Degree";
            $headers[] = "Betweenness";
            $headers[] = "Eigenvector";
        }
*/
        $interviewIds = array();
        $interviewIds = explode(",",$_POST['interviewIds']);
        /*
        foreach ($_POST['export'] as $key=>$value) {
            $interviewIds[] = $key;
        }*/
        // start generating export file
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=".seoString($study->name)."-ego-level-data".".csv");
        header("Content-Type: application/force-download");
        echo implode(',', $headers) . "\n";
        foreach ($interviewIds as $interviewId) {
            $filePath = getcwd() . "/assets/" . $_POST['studyId'] . "/". $interviewId . "-ego-level-data.csv";
            if (file_exists($filePath)) {
                echo file_get_contents($filePath);
                unlink($filePath);
            }
        }
        Yii::app()->end();
    }

    public function actionExportegoalter()
    {
        if (!isset($_POST['studyId'])) {
            die("no study selected");
        }

        $filePath = getcwd()."/assets/".$_POST['studyId'];
        if (file_exists($filePath . "/" . $_POST['interviewId'] . "-ego-alter.csv")) {
            echo "success";
            Yii::app()->end();
        }

        if (!is_dir($filePath)) {
            mkdir($filePath, 0777, true);
        }

        $withAlters = false;
        if (isset($_POST['withAlters'])) {
            $withAlters = boolval($_POST['withAlters']);
        }

        $interview = Interview::model()->findByPk($_POST['interviewId']);
        if ($interview) {
            $file = fopen($filePath . "/" . $_POST['interviewId'] . "-ego-alter.csv", "w") or die("Unable to open file!");
            $interview->exportEgoAlterData($file, $withAlters);
            echo "success";
            Yii::app()->end();
        }
        echo "fail";
    }

    public function actionExportalterpairall()
    {
        if (!isset($_POST['studyId']) || $_POST['studyId'] == "") {
            die("no study selected");
        }

        $filePath = getcwd()."/assets/".$_POST['studyId'];
        if (file_exists($filePath . "/" . $_POST['interviewId'] . ".csv")) {
            echo "success";
            Yii::app()->end();
        }

        $withAlters = false;
        if (isset($_POST['withAlters'])) {
            $withAlters = boolval($_POST['withAlters']);
        }

        $study = Study::model()->findByPk((int)$_POST['studyId']);

        $criteria=new CDbCriteria;
        $criteria->condition = ("studyId = $study->id and subjectType = 'ALTER_PAIR'");
        $criteria->order = "ordering";
        $alter_pair_questions = Question::model()->findAll($criteria);

        $idNumber = "Number";

        $headers = array();
        $headers[] = 'Interview ID';
        $headers[] = 'EgoID';
        $headers[] = "Alter 1 " . $idNumber;
        if($withAlters)
            $headers[] = "Alter 1 Name";
        $headers[] = "Alter 2 " . $idNumber;
        if($withAlters)
            $headers[] = "Alter 2 Name";
        foreach ($alter_pair_questions as $question) {
            $headers[] = $question->title;
        }

        $interviewIds = array();
        $interviewIds = explode(",",$_POST['interviewIds']);
        /*
        foreach ($_POST['export'] as $key=>$value) {
            $interviewIds[] = $key;
        }
        */
        // start generating export file
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=".seoString($study->name)."-alter-pair-data".".csv");
        header("Content-Type: application/force-download");
        echo implode(',', $headers) . "\n";
        foreach ($interviewIds as $interviewId) {
            $filePath = getcwd() . "/assets/" . $_POST['studyId'] . "/". $interviewId . "-alter-pair.csv";
            if (file_exists($filePath)) {
                echo file_get_contents($filePath);
                unlink($filePath);
            }
        }
        Yii::app()->end();
    }

    public function actionExportalterpair()
    {
        if (!isset($_POST['studyId'])) {
            die("no study selected");
        }

        $study = Study::model()->findByPk((int)$_POST['studyId']);

        $filePath = getcwd()."/assets/".$_POST['studyId'];
        if (file_exists($filePath . "/" . $_POST['interviewId'] . "-alter-pair.csv")) {
            echo "success";
            Yii::app()->end();
        }

        if (!is_dir($filePath)) {
            mkdir($filePath, 0777, true);
        }

        $withAlters = false;
        if (isset($_POST['withAlters'])) {
            $withAlters = boolval($_POST['withAlters']);
        }

        $interview = Interview::model()->findByPk($_POST['interviewId']);
        if ($interview) {
            $file = fopen($filePath . "/" . $_POST['interviewId'] . "-alter-pair.csv", "w") or die("Unable to open file!");
            $interview->exportAlterPairData($file, $study, $withAlters);
            //fwrite($file, $text);
            echo "success";
            Yii::app()->end();
        }
        echo "fail";
    }

    public function actionExportother()
    {
        if (!isset($_POST['studyId']) || $_POST['studyId'] == "") {
            die("nothing to export");
        }

        $study = Study::model()->findByPk((int)$_POST['studyId']);

        $file = fopen(getcwd() . "/assets/" . $study->id . "-other-specify.csv", "w") or die("Unable to open file!");

        $headers = array();
        $headers[] = 'INTERVIEW ID';
        $headers[] = "EGO ID";
        $headers[] = "QUESTION";
        $headers[] = "ALTER ID";
        $headers[] = "RESPONSE OPTION";
        $headers[] = "TEXT";

        fputcsv($file, $headers);

        #OK FOR SQL INJECTION
        $options = QuestionOption::model()->findAllByAttributes(array("otherSpecify"=>true, "studyId"=>$study->id));
        if (!$options) {
            $allOptions = QuestionOption::model()->findAllByAttributes(array("studyId"=>$study->id));
            foreach ($allOptions as $option) {
                if (preg_match("/OTHER \(*SPECIFY\)*/i", $option->name)) {
                    $options[] = $option;
                }
            }
        }
        if (!$options) {
            die("no other specified data to export");
        }
        foreach ($options as $option) {
            $other_options[$option->id] = $option;
            if (!isset($other_qs[$option->questionId])) {
                $other_qs[$option->questionId] = Question::model()->findByPk($option->questionId);
            }
        }
        $interviewIds = explode(",",$_POST['interviewIds']);
        $interviews = Interview::model()->findAllByAttributes(array('studyId'=>$_POST['studyId']));
        foreach ($interviews as $interview) {
            if(!in_array($interview->id, $interviewIds))
                continue;
            /*
            if (!isset($_POST['export'][$interview->id])) {
                continue;
            }*/
            $answers = array();
            $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$interview->id));
            foreach ($answerList as $a) {
                if ($a->alterId1 && $a->alterId2) {
                    $answers[$a->questionId . "-" . $a->alterId1 . "and" . $a->alterId2] = $a;
                } elseif ($a->alterId1 && ! $a->alterId2) {
                    $answers[$a->questionId . "-" . $a->alterId1] = $a;
                } else {
                    $answers[$a->questionId] = $a;
                }
            }
            foreach ($other_qs as $question) {
                if ($question->subjectType == "ALTER") {
                    $alters = Alters::model()->findAllByAttributes(array('interviewId'=>$interview->id));
                    foreach ($alters as $alter) {
                        $answerArray = array();
                        $otherSpecifies = array();
                        $response = $answers[$question->id . "-" . $alter->id]->otherSpecifyText;
                        if (!$response) {
                            continue;
                        }
                        foreach (preg_split('/;;/', $response) as $otherSpecify) {
                            if (strstr($otherSpecify, ':')) {
                                list($optionId, $val) = preg_split('/:/', $otherSpecify);
                                $otherSpecifies[$optionId] = $val;
                            }
                        }
                        $optionIds = explode(",", $answers[$question->id . "-" . $alter->id]->value);
                        foreach ($optionIds as $optionId) {
                            if (isset($otherSpecifies[$optionId])) {
                                if (count($optionIds) == 1 && preg_match("/OTHER \(*SPECIFY\)*/i", $other_options[$optionId]->name)) {
                                    $answerArray["OTHER SPECIFY"] = $otherSpecifies[$optionId];
                                } else {
                                    $answerArray[$other_options[$optionId]->name] = $otherSpecifies[$optionId];
                                }
                            } else {
                                $answerArray[$other_options[$optionId]->name] = "";
                            }
                        }

                        foreach ($answerArray as $i=>$a) {
                            $answer = array();
                            $answer[] = $interview->id;
                            $answer[] = Interview::getEgoId($interview->id);
                            $answer[] = $question->title;
                            $answer[] = $alter->name;
                            $answer[] = $i;
                            $answer[] = $a;
                            fputcsv($file, $answer);
                        }
                    }
                } else {
                    $answerArray = array();
                    $otherSpecifies = array();
                    $response = $answers[$question->id]->otherSpecifyText;
                    if (!$response) {
                        continue;
                    }
                    foreach (preg_split('/;;/', $response) as $otherSpecify) {
                        if (strstr($otherSpecify, ':')) {
                            list($optionId, $val) = preg_split('/:/', $otherSpecify);
                            $otherSpecifies[$optionId] = $val;
                        }
                    }
                    $optionIds = explode(",", $answers[$question->id]->value);
                    foreach ($optionIds as $optionId) {
                        if (isset($other_options[$optionId])) {
                            if (isset($otherSpecifies[$optionId])) {
                                if (count($optionIds) == 1 && preg_match("/OTHER \(*SPECIFY\)*/i", $other_options[$optionId]->name)) {
                                    $answerArray["OTHER SPECIFY"] = $otherSpecifies[$optionId];
                                } else {
                                    $answerArray[$other_options[$optionId]->name] = $otherSpecifies[$optionId];
                                }
                            } else {
                                $answerArray[$other_options[$optionId]->name] = "";
                            }
                        }
                    }

                    foreach ($answerArray as $i=>$a) {
                        $answer = array();
                        $answer[] = $interview->id;
                        $answer[] = Interview::getEgoId($interview->id);
                        $answer[] = $question->title;
                        $answer[] = "";
                        $answer[] = $i;
                        $answer[] = $a;
                        fputcsv($file, $answer);
                    }
                }
            }
        }

        // start generating export file
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=".seoString($study->name)."-other-specify-data".".csv");
        header("Content-Type: application/force-download");

        $filePath = getcwd() . "/assets/" . $_POST['studyId'] . "-other-specify.csv";
        if (file_exists($filePath)) {
            echo file_get_contents($filePath);
            unlink($filePath);
        }
        Yii::app()->end();
    }

    public function actionLegacyexportother()
    {
        if (!isset($_POST['studyId']) || $_POST['studyId'] == "") {
            die("nothing to export");
        }

        $study = Study::model()->findByPk((int)$_POST['studyId']);


        $file = fopen(getcwd() . "/assets/" . $study->id . "-other-specify.csv", "w") or die("Unable to open file!");

        $headers = array();
        $headers[] = 'INTERVIEW ID';
        $headers[] = "EGO ID";
        $headers[] = "QUESTION";
        $headers[] = "ALTER ID";
        $headers[] = "RESPONSE OPTION";
        $headers[] = "TEXT";
        fputcsv($file, $headers);

        #OK FOR SQL INJECTION
        $options = QuestionOption::model()->findAllByAttributes(array("otherSpecify"=>true, "studyId"=>$study->id));
        if (!$options) {
            die();
        }
        foreach ($options as $option) {
            $other_options[$option->id] = $option;
            if (!isset($other_qs[$option->questionId])) {
                $other_qs[$option->questionId] = Question::model()->findByPk($option->questionId);
            }
        }
        $interviews = Interview::model()->findAllByAttributes(array('studyId'=>$_POST['studyId']));
        foreach ($interviews as $interview) {
            if (!isset($_POST['export'][$interview->id])) {
                continue;
            }
            foreach ($other_qs as $question) {
                $answers = array();
                $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$interview->id));
                foreach ($answerList as $a) {
                    if ($a->alterId1 && $a->alterId2) {
                        $answers[$a->questionId . "-" . $a->alterId1 . "and" . $a->alterId2] = $a;
                    } elseif ($a->alterId1 && ! $a->alterId2) {
                        $answers[$a->questionId . "-" . $a->alterId1] = $a;
                    } else {
                        $answers[$a->questionId] = $a;
                    }
                }
                if ($question->subjectType == "ALTER") {
                    $alters = Alters::model()->findAllByAttributes(array('interviewId'=>$interview->id));
                    foreach ($alters as $alter) {
                        $answer = array();
                        //  print_r($other_qs);
                        //echo $question->id;
                        //$optionIds = $other_qs[$question->id];  //explode(",", $answers[$question->id . "-" . $alter->id]->value);
                        $answerArray = array();
                        foreach ($other_options as $option) {
                            //            if (isset($other_options[$optionId])) {
                            $otherSpecify = OtherSpecify::model()->findByAttributes(array("optionId"=>$option->id, "interviewId"=>$interview->id, "alterId"=>$alter->id));
                            if ($otherSpecify) {
                                $answerArray[$option->name] =  $otherSpecify->value;
                            }
                            //    else
                            //        $answerArray[$option->name] = "";
                          //  }
                        }

                        foreach ($answerArray as $i=>$a) {
                            $answer = array();
                            $answer[] = $interview->id;
                            $answer[] = Interview::getEgoId($interview->id);
                            $answer[] = $question->title;
                            $answer[] = $alter->name;
                            $answer[] = $i;
                            $answer[] = $a;
                            echo implode(',', $answer) . "\n";
                            fputcsv($file, $answer);
                        }
                        /*
                        $answer[] = $interview->id;
                        $answer[] = Interview::getEgoId($interview->id);
                        $answer[] = $question->title;
                        $answer[] = $alter->name;
                        $answer[] = implode("; ", $answerArray);
                        */

                        //echo implode(',', $answer) . "\n";
                    }
                } else {
                    $answer = array();
                    $optionIds = explode(",", $answers[$question->id]->value);
                    $answerArray = array();
                    foreach ($optionIds as $optionId) {
                        if (isset($other_options[$optionId])) {
                            $otherSpecify = OtherSpecify::model()->findByAttributes(array("optionId"=>$optionId, "interviewId"=>$interview->id));
                            if ($otherSpecify) {
                                $answerArray[$other_options[$optionId]->name] =  $otherSpecify->value;
                            }
                            //    else
                          //      $answerArray[$other_options[$optionId]->name] = "";
                        }
                    }

                    foreach ($answerArray as $i=>$a) {
                        $answer = array();
                        $answer[] = $interview->id;
                        $answer[] = Interview::getEgoId($interview->id);
                        $answer[] = $question->title;
                        $answer[] = $alter->name;
                        $answer[] = $i;
                        $answer[] = $a;
                        fputcsv($file, $answer);
                    }
                }
            }
        }

        // start generating export file
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=".seoString($study->name)."-other-specify-data".".csv");
        header("Content-Type: application/force-download");

        $filePath = getcwd() . "/assets/" . $_POST['studyId'] . "-other-specify.csv";
        if (file_exists($filePath)) {
            echo file_get_contents($filePath);
            unlink($filePath);
        }

        Yii::app()->end();
    }

    public function actionExportalterlist()
    {
        if (!isset($_POST['studyId']) || $_POST['studyId'] == "") {
            die("nothing to export");
        }

        $study = Study::model()->findByPk((int)$_POST['studyId']);
        #OK FOR SQL INJECTION
        $alters = AlterList::model()->findAllByAttributes(array("studyId"=>$study->id));

        // start generating export file
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=".seoString($study->name)."-predefined-alters".".csv");
        header("Content-Type: application/force-download");

        $headers = array();
        $headers[] = 'Study ID';
        $headers[] = "Alter ID";
        $headers[] = "Alter Name";
        $headers[] = "Alter Email";
        $headers[] = "Link With Key";
        echo implode(',', $headers) . "\n";

        $ego_id = Question::model()->findByAttributes(array("studyId"=>$study->id, "subjectType"=>"EGO_ID", "useAlterListField"=>array("name", "email", "id")));

        foreach ($alters as $alter) {
            $row = array();
            if ($ego_id->useAlterListField == "name") {
                $key = User::hashPassword($alter->name);
            } elseif ($ego_id->useAlterListField == "email") {
                $key = User::hashPassword($alter->email);
            } elseif ($ego_id->useAlterListField == "id") {
                $key = User::hashPassword($alter->id);
            } else {
                $key = "";
            }
            $row[] = $study->id;
            $row[] = $alter->id;
            $row[] = $alter->name;
            $row[] = $alter->email;
            $row[] =  Yii::app()->getBaseUrl(true) . "/interview/".$study->id."#/page/0/".$key;
            echo implode(',', $row) . "\n";
        }
        Yii::app()->end();
    }

    public function actionSavegraph()
    {
        if ($_POST['Graph']) {
            $graph = Graph::model()->findByAttributes(array("interviewId"=>$_POST['Graph']['interviewId'],"expressionId"=>$_POST['Graph']['expressionId']));
            if (!$graph) {
                $graph = new Graph;
            }
            $graph->attributes = $_POST['Graph'];
            if ($graph->save()) {
                //echo "success";
                $graphs = array();
                $results = Graph::model()->findAllByAttributes(array('interviewId'=>$_POST['Graph']['interviewId']));
                foreach ($results as $result) {
                    $graphs[$result->expressionId] = mToA($result);
                }
                echo json_encode($graphs);
                die();
                //$url =  "graphId=" . $graph->id . "&interviewId=" . $graph->interviewId . "&expressionId=".$graph->expressionId."&params=".urlencode($graph->params);
                //Yii::app()->request->redirect($this->createUrl("/data/visualize?" . $url));
            }
        }
    }

    public function actionDeletegraph()
    {
        if (isset($_GET['id'])) {
            $graph = Graph::model()->findByPk($_GET['id']);
            if ($graph) {
                $graph->delete();
            }
        }
    }

    public function actionGetnote()
    {
        if (isset($_GET['interviewId']) && isset($_GET['expressionId']) && isset($_GET['alterId'])) {
            $model = Note::model()->findByAttributes(array(
                'interviewId' => (int)$_GET['interviewId'],
                'expressionId' => (int)$_GET['expressionId'],
                'alterId' => $_GET['alterId']
            ));
            if (!$model) {
                $model = new Note;
                $model->interviewId = $_GET['interviewId'];
                $model->expressionId = $_GET['expressionId'];
                $model->alterId = $_GET['alterId'];
            }
            $this->renderPartial('_form_note', array('model'=>$model, 'ajax'=>true), false, false);
        }
    }

    public function actionSavenote()
    {
        if (isset($_POST['Note'])) {
            $new = false;
            if ($_POST['Note']['id']) {
                $note = Note::model()->findByPk((int)$_POST['Note']['id']);
            } else {
                $note = new Note;
                $new = true;
            }
            $note->attributes = $_POST['Note'];
            if (!$note->save()) {
                print_r($note->errors);
            }

            echo $note->alterId;
        }
    }

    public function actionDeletenote()
    {
        if (isset($_POST['Note'])) {
            $note = Note::model()->findByPk((int)$_POST['Note']['id']);
            $alterId = $note->alterId;
            if ($note) {
                $note->delete();
                echo $alterId;
            }
        }
    }

    public function actionDeleteinterviews()
    {
        // TODO:: implement for alters in multiple interviews
        if (!isset($_POST['interviewIds'])) {
            return false;
        }
        $interviewIds = array();
        $interviewIds = explode(",", $_POST['interviewIds']);
        foreach ($interviewIds as $interviewId) {
            $model = Interview::model()->findByPk((int)$interviewId);
            if ($model) {
                $answers = Answer::model()->findAllByAttributes(array("interviewId"=>$interviewId));
                foreach ($answers as $answer) {
                    $answer->delete();
                }
                $alters = Alters::model()->findAllByAttributes(array("interviewId"=>$interviewId));
                foreach ($alters as $alter) {
                    $alter->delete();
                }
                $criteria = array(
                    'condition'=>"FIND_IN_SET(" . $interviewId .", interviewId)",
                );
                $alters = Alters::model()->findAll($criteria);
                foreach ($alters as $alter) {
                    if (strstr($alter->interviewId, ",")) {
                        $interviewIds = explode(",", $alter->interviewId);
                        $interviewIds = array_diff($interviewIds, array($interviewId));
                        $alter->interviewId = implode(",", $interviewIds);
                        $alter->save();
                    }
                }
                $model->delete();
            }
        }
        Yii::app()->request->redirect(Yii::app()->request->urlReferrer);
    }
}
