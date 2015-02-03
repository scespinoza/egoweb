<?php
class ImportExportController extends Controller
{
	public function actionImportstudy()
	{

		if(!is_uploaded_file($_FILES['userfile']['tmp_name'])) //checks that file is uploaded
			die("Error importing study");

		$study = simplexml_load_file($_FILES['userfile']['tmp_name']);
		$newStudy = new Study;
		$newQuestionIds = array();
		$newOptionIds = array();
		$newExpressionIds = array();
		$newInterviewIds = array();
		$newAnswerIds = array();
		$newAlterIds = array();
		$merge = false;

		foreach($study->attributes() as $key=>$value){
			if($key!="key" && $key != "id")
				$newStudy->$key = $value;
			if($key == "name"){
				$oldStudy = Study::model()->findByAttributes(array("name"=>$value));

				if($oldStudy){
					$merge = true;
					$newStudy = $oldStudy;
				}
			}
		}


		if(!$merge){

			foreach($study as $key=>$value){
				if(count($value) == 0 && $key != "answerLists" && $key != "expressions")
					$newStudy->$key = html_entity_decode ($value);
			}
			if(isset($_POST['newName']) && $_POST['newName'])
				$newStudy->name = $_POST['newName'];

			if(!$newStudy->save()){
				print_r($newStudy->getErrors());
				die();
			}

			if($study->alterPrompts->alterPrompt){

				foreach($study->alterPrompts->alterPrompt as $alterPrompt){
					$newAlterPrompt = new AlterPrompt;
					foreach($alterPrompt->attributes() as $key=>$value){
						if($key != "id")
							$newAlterPrompt->$key = $value;
						if($key == "afterAltersEntered")
							$value = intval($value);
					}
					$newAlterPrompt->studyId = $newStudy->id;
					if(!$newAlterPrompt->save())
						echo "Alter prompt: " . print_r($newAlterPrompt->errors);
				}
			}

			foreach($study->questions->question as $question){
				$newQuestion = new Question;
				$newQuestion->studyId = $newStudy->id;
				foreach($question->attributes() as $key=>$value){
					if($key == "id")
						$oldId = intval($value);
					if($key == "ordering")
						$value = intval($value);
					if($key!="key" && $key != "id" && $key != "networkNShapeQId")
						$newQuestion->$key = $value;
				}
				if($newQuestion->answerType == "SELECTION"){
					$newQuestion->answerType = "MULTIPLE_SELECTION";
					$newQuestion->minCheckableBoxes = 1;
					$newQuestion->maxCheckableBoxes = 1;
				}
				$options = 0;
				foreach($question as $key=>$value){
					if($key == "option"){
						$options++;
					}else if(count($value) == 0 && $key != "option"){
						$newQuestion->$key = html_entity_decode ($value);
					}
				}
				if(!$newQuestion->save())
					echo "Question: " . print_r($newQuestion->getErrors());
				else
					$newQuestionIds[$oldId] = $newQuestion->id;

				if($options > 0){
					foreach($question->option as $option){
						$newOption = new QuestionOption;
						$newOption->studyId = $newStudy->id;
						$newOption->questionId = $newQuestion->id;
						foreach($option->attributes() as $optionkey=>$val){
							if($optionkey == "id")
								$oldOptionId = intval($val);
							if($optionkey == "ordering")
								$val = intval($val);
							if($optionkey!="key" && $optionkey != "id")
								$newOption->$optionkey = $val;
						}
						if(!$newOption->save())
							echo "Option: " . print_r($newOption->getErrors());
						else
							$newOptionIds[$oldOptionId] = $newOption->id;
					}
				}
			}

			// loop through the questions and correct linked ids
			$newQuestions = Question::model()->findAllByAttributes(array('studyId'=>$newStudy->id));
			foreach($newQuestions as $newQuestion){
				if($newQuestion->networkParams != 0)
					$newQuestion->networkParams = $newQuestionIds[$newQuestion->networkParams];
				if($newQuestion->networkNColorQId != 0)
					$newQuestion->networkNColorQId = $newQuestionIds[$newQuestion->networkNColorQId];
				if($newQuestion->networkNSizeQId != 0)
					$newQuestion->networkNSizeQId = $newQuestionIds[$newQuestion->networkNSizeQId];
				if($newQuestion->networkEColorQId != 0)
					$newQuestion->networkEColorQId = $newQuestionIds[$newQuestion->networkEColorQId];
				if($newQuestion->networkESizeQId != 0)
					$newQuestion->networkESizeQId = $newQuestionIds[$newQuestion->networkESizeQId];
				$newQuestion->save();
			}

			if($newStudy->multiSessionEgoId != 0 && isset($newQuestionIds[intval($newStudy->multiSessionEgoId)])){
				$newStudy->multiSessionEgoId = $newQuestionIds[intval($newStudy->multiSessionEgoId)];
				$newStudy->save();
			}

			if(count($study->expressions) != 0){
				foreach($study->expressions->expression as $expression){
					$newExpression = new Expression;
					$newExpression->studyId = $newStudy->id;
					foreach($expression->attributes() as $key=>$value){
						if($key == "id")
							$oldExpressionId = intval($value);
						if($key == "ordering")
							$value = intval($value);
						if($key!="key" && $key != "id")
							$newExpression->$key = $value;
					}
					// reference the correct question, since we're not using old ids

					if($newExpression->questionId != "" && isset($newQuestionIds[intval($newExpression->questionId)]))
						$newExpression->questionId = $newQuestionIds[intval($newExpression->questionId)];

					$newExpression->value = $expression->value;
					if(!$newExpression->save())
						echo "Expression: " . print_r($newExpression->getErrors());
					else
						$newExpressionIds[$oldExpressionId] = $newExpression->id;
				}
				// replace adjacencyExpressionId for study
				if($newStudy->adjacencyExpressionId != "" && isset($newExpressionIds[intval($newStudy->adjacencyExpressionId)])){
					$newStudy->adjacencyExpressionId = $newExpressionIds[intval($newStudy->adjacencyExpressionId)];
					$newStudy->save();
				}
				// second loop to replace old ids in Expression->value
				foreach($study->expressions->expression as $expression){
					if(!isset($newExpressionIds[$oldExpressionId]))
						continue;
					foreach($expression->attributes() as $key=>$value){
						if($key == "id"){
							$oldExpressionId = intval($value);
							$newExpression = Expression::model()->findByPk($newExpressionIds[$oldExpressionId]);
						}
					}
					// replace answerReasonExpressionId for newly uploaded questions with correct expression ids
					$questions = Question::model()->findAllByAttributes(array('studyId'=>$newStudy->id,'answerReasonExpressionId'=>$oldExpressionId));
					if(count($questions) > 0){
						foreach($questions as $question){
							$question->answerReasonExpressionId = $newExpressionIds[$oldExpressionId];
							$question->save();
						}
					}
					$questions = Question::model()->findAllByAttributes(array('studyId'=>$newStudy->id,'networkRelationshipExprId'=>$oldExpressionId));
					if(count($questions) > 0){
						foreach($questions as $question){
							$question->networkRelationshipExprId = $newExpressionIds[$oldExpressionId];
							$question->save();
						}
					}
					// reference the correct question, since we're not using old ids
					if($newExpression->type == "Selection"){
						$optionIds = explode(',', $newExpression->value);
						foreach($optionIds as &$optionId){
							if(is_numeric($optionId) && isset($newOptionIds[$optionId]))
								$optionId = $newOptionIds[$optionId];
						}
						$newExpression->value = implode(',', $optionIds);
					} else if($newExpression->type == "Counting"){
						if(!strstr($newExpression->value, ':'))
							continue;
						list($times, $expressionIds, $questionIds) = explode(':', $newExpression->value);
						if($expressionIds != ""){
							$expressionIds = explode(',', $expressionIds);
							foreach($expressionIds as &$expressionId){
								$expressionId = $newExpressionIds[$expressionId];
							}
							$expressionIds = implode(',',$expressionIds);
						}
						if($questionIds != ""){
							$questionIds = explode(',', $questionIds);
							foreach($questionIds as &$questionId){
								if(isset($newQuestionIds[$questionId]))
									$questionId = $newQuestionIds[$questionId];
								else
									$questionId = '';
							}
							$questionIds = implode(',', $questionIds);
						}
						$newExpression->value = $times . ":" .  $expressionIds . ":" . $questionIds;
					} else if($newExpression->type == "Comparison"){
						list($value, $expressionId) = explode(':', $newExpression->value);
						$newExpression->value = $value . ":" . $newExpressionIds[$expressionId];
					} else if($newExpression->type == "Compound"){
						$expressionIds = explode(',', $newExpression->value);
						foreach($expressionIds as &$expressionId){
							if(is_numeric($expressionId))
								$expressionId = $newExpressionIds[$expressionId];
						}
						$newExpression->value = implode(',',$expressionIds);
					}
					$newExpression->save();
				}

			}

		}

		if(count($study->interviews) != 0){
			foreach($study->interviews->interview as $interview){
				$newAlterIds = array();
				$newInterview = new Interview;
				$newInterview->studyId = $newStudy->id;
				foreach($interview->attributes() as $key=>$value){
					if($key == "id")
						$oldInterviewId = $value;
					if($key!="key" && $key != "id")
						$newInterview->$key = $value;
				}
				$newInterview->studyId = $newStudy->id;
				if(!$newInterview->save())
					print_r($newInterview->errors);
				else
					$newInterviewIds[intval($oldInterviewId)] = $newInterview->id;

				if(count($interview->alters->alter) != 0){
					foreach($interview->alters->alter as $alter){
						$newAlter = new Alters;
						foreach($alter->attributes() as $key=>$value){
							if($key == "id")
								$thisAlterId = $value;
							if($key!="key" && $key != "id")
								$newAlter->$key = $value;
						}
						if(!preg_match("/,/", $newAlter->interviewId))
							$newAlter->interviewId = $newInterview->id;

						$newAlter->ordering=1;

						if(!$newAlter->save()){
							"Alter: " . print_r($newAlter->getErrors());
							die();
						}else{
							$newAlterIds[intval($thisAlterId)] = $newAlter->id;
						}
					}
				}

				if(count($interview->answers->answer) != 0){
					foreach($interview->answers->answer as $answer){
						$newAnswer = new Answer;

						foreach($answer->attributes() as $key=>$value){
							if($key!="key" && $key != "id")
								$newAnswer->$key = $value;
									if($key == "alterId1" && isset($newAlterIds[intval($value)]))
										$newAnswer->alterId1 = $newAlterIds[intval($value)];
									if($key == "alterId2" && isset($newAlterIds[intval($value)]))
										$newAnswer->alterId2 = $newAlterIds[intval($value)];

								if(!$merge){

									if($key == "questionId"){
										$newAnswer->questionId = $newQuestionIds[intval($value)];
										$oldQId = intval($value);
									}

									if($key == "answerType")
										$answerType = $value;
								}
						}

						if(!$merge){

							if($answerType == "MULTIPLE_SELECTION" && !in_array($newAnswer->value, array($newStudy->valueRefusal,$newStudy->valueDontKnow,$newStudy->valueLogicalSkip,$newStudy->valueNotYetAnswered))){
								$values = explode(',', $newAnswer->value);
								foreach($values as &$value){
									if(isset($newOptionIds[intval($value)]))
										$value = $newOptionIds[intval($value)];
								}
								$newAnswer->value = implode(',', $values);
							}

						}

						$newAnswer->studyId = $newStudy->id;
						$newAnswer->interviewId = $newInterview->id;

						if(!isset($newQuestionIds[$oldQId]) || !$newQuestionIds[$oldQId])
							continue;

						if(!$newAnswer->save()){
							echo $oldQId . "<br>";
							echo $newQuestionIds[$oldQId]."<br>";
							print_r($newQuestionIds);
							print_r($newAnswer);
							die();
						}
					}
				}
			}
		}

		foreach($newAlterIds as $oldId=>$newId){
			$alter = Alters::model()->findByPk($newId);
			if(preg_match("/,/", $alter->interviewId)){
				$values = explode(',', $alter->interviewId);
				foreach($values as &$value){
					if(isset($newInterviewIds[intval($value)]))
						$value = $newInterviewIds[intval($value)];
				}
				$alter->interviewId = implode(',', $values);
				$alter->save();
			}
		}

		if(count($study->answerLists) != 0){
			foreach($study->answerLists->answerList as $answerList){
				$newAnswerList = new AnswerList;
				$newAnswerList->studyId = $newStudy->id;
				foreach($answerList->attributes() as $key=>$value){
					if($key!="key" && $key != "id")
						$newAnswerList->$key = $value;
				}
				if(!$newAnswerList->save())
					echo "AnswerList: " .  print_r($newAnswerList->getErrors());
			}
		}

		$this->redirect(array('/authoring/edit','id'=>$newStudy->id));

	}

	public function actionReplicate(){
		if($_POST['name'] == "" || $_POST['studyId'] == "")
			die("nothing to replicate");
		$study = Study::model()->findByPk((int)$_POST['studyId']);
		$study->name = $_POST['name'];
		$questions = Question::model()->findAllByAttributes(array('studyId'=>$_POST['studyId']));
		$options = QuestionOption::model()->findAllByAttributes(array('studyId'=>$_POST['studyId']));
		$expressions = Expression::model()->findAllByAttributes(array('studyId'=>$_POST['studyId']));
		$answerLists = AnswerList::model()->findAllByAttributes(array('studyId'=>$_POST['studyId']));

		$data = Study::replicate($study, $questions, $options, $expressions, $answerLists);
		$this->redirect(array('/authoring/edit','id'=>$data['studyId']));

	}

	public function actionIndex()
	{
		$this->render('index');
	}

	public function actionAjaxInterviews($id)
	{
		$study = Study::model()->findByPk($id);
		$interviews = Interview::model()->findAllByAttributes(array('studyId'=>$id));
		$this->renderPartial('_interviews',
			array(
				'study'=>$study,
				'interviews'=>$interviews,
			), false, true
		);
	}

	public function actionExportstudy(){
		if(!isset($_POST['studyId']) || $_POST['studyId'] == "")
			die("nothing to export");

		$study = Study::model()->findByPk((int)$_POST['studyId']);

		header("Content-type: text/xml; charset=utf-8");
		header("Content-Disposition: attachment; filename=".$study->name.".study");
		header("Content-Type: application/force-download");

		echo $study->export($_POST['export']);
	}
}
