var app = angular.module('egowebApp', ['ngRoute', 'autocomplete']);
var masterList = [];
var evalQList = {};
var evalQIndex = [];
var currentPage = 0;
var alterPromptPage = false;
deletedPrevAlters = {};

app.config(function ($routeProvider) {

  $routeProvider

    .when('/page/:page', {
      templateUrl: baseUrl + 'interview.html',
      controller: 'interviewController'
    })

    .when('/page/:page/:key', {
      templateUrl: baseUrl + 'interview.html',
      controller: 'interviewController'
    })

});

app.controller('interviewController', ['$scope', '$log', '$routeParams', '$sce', '$location', '$route', "saveAlter", "deleteAlter", function ($scope, $log, $routeParams, $sce, $location, $route, saveAlter, deleteAlter) {
  for (xx in answers) {
    answers[xx].VALUE = answers[xx].VALUE.replace(/[\u0000-\u001F]+/ig, "\n")
  }
  if (masterList.length == 0) {
    buildList();
    evalQuestions();
  }
  var style = document.createElement('style');
  style.innerHTML = study.STYLE;

  // Insert our new styles before the first script tag
  $('head').append(style);
  $scope.questions = qFromList($routeParams.page)
  $scope.page = $routeParams.page;
  $scope.study = study;
  $scope.csrf = csrf;
  $scope.interviewId = interviewId;
  $scope.answers = $.extend(true, {}, answers);
  $scope.options = new Object;
  $scope.alters = $.extend(true, {}, alters);
  $scope.nGalters = []
  $scope.alterPrompt = "";
  $scope.askingStyleList = false;
  $scope.hideQ = false;
  $scope.subjectType = false;
  $scope.answerType = false;
  $scope.qId = "";
  $scope.prompt = "";
  $scope.alterName = "";
  $scope.dates = new Object;
  $scope.time_spans = new Object;
  $scope.graphId = "";
  $scope.graphExpressionId = "";
  $scope.graphInterviewId = "";
  $scope.graphNodes = "";
  $scope.graphParams = "";
  $scope.otherSpecify = {};
  $scope.otherGraphs = {};
  $scope.audioFiles = {};
  $scope.audio = {};
  $scope.keys = Object.keys;
  $scope.hashKey = "";
  $scope.interview = interview;
  $scope.header = $sce.trustAsHtml(study.HEADER);
  $scope.footer = $sce.trustAsHtml(study.FOOTER);
  $scope.phrase = "";
  $scope.conclusion = false;
  $scope.redirect = false;
  $scope.participants = [];
  $scope.listedAlters = {};
  $scope.prevAlters = {};
  $scope.starExpressionId = false;
  $scope.colspan = false;
  $scope.refuseCount = 0;
  $scope.hasRefuse = false;
  current_array_ids = []
  if (typeof $scope.questions[0] != "undefined" && $scope.questions[0].SUBJECTTYPE == "NAME_GENERATOR") {
    alterPromptPage = true;
    for (k in $scope.alters) {
      if ($scope.alters[k].INTERVIEWID.match(",")) {
        deletedPrevAlters[k] = $scope.alters[k];
      }
      if ($scope.alters[k].NAMEGENQIDS != null) {
        var nGs = $scope.alters[k].NAMEGENQIDS.split(",");
        var nGorder = JSON.parse($scope.alters[k].ORDERING);
        // we put alters in lists according to the name generator question id
        if(nGs.indexOf($scope.questions[0].ID.toString()) != -1) {
          if(typeof nGorder[$scope.questions[0].ID] != "undefined")
            $scope.nGalters[parseInt(nGorder[$scope.questions[0].ID])] = $scope.alters[k];
          else
            $scope.nGalters.push($scope.alters[k]);
        }else{
          if (typeof $scope.listedAlters[k] == "undefined")
            $scope.listedAlters[k] = alters[k];
        }
      }
    }
    $scope.prevAlters = prevAlters;
    console.log($scope.nGalters);
  } else {
    alterPromptPage = false;
  }
    
  
  if (typeof hashKey != "undefined") {
    $scope.hashKey = hashKey;
  } else {
    if (typeof $routeParams.key != "undefined") {
      $scope.hashKey = $routeParams.key;
      hashKey = $routeParams.key;
    }
  }

  if (typeof redirect !== 'undefined' && redirect)
    $scope.redirect = redirect;

  for (k in audio) {
    $scope.audio[k] = audio[k];
    $scope.audioFiles[k] = new Audio();
    $scope.audioFiles[k].src = audio[k];
  }

  navFromList($scope.page, $scope);
  //$scope.nav = buildNav($scope.page, $scope);

  if (!isGuest) {
    $('#navbox ul').html("");
    for (k in $scope.nav) {
      if (baseUrl == "/www/")
        $('#navbox ul').append("<li id='menu_" + k + "'><a href='/interview/" + study.ID + (interviewId ? "/" + interviewId : "") + "#page/" + k + "'>" + $scope.nav[k] + "</a></li>");
      else
        $('#navbox ul').append("<li id='menu_" + k + "']]><a href='" + $location.absUrl().replace($location.url(), '') + "page/" + k + "'>" + $scope.nav[k] + "</a></li>");
    }
    $("#second").show();
    if ($("#menu_" + $scope.page).length > 0)
      $("#second").scrollTop($("#second").scrollTop() - $("#second").offset().top + $("#menu_" + $scope.page).offset().top);
    $("#questionMenu").removeClass("hidden");
  }

  for (var k in $scope.questions) {
    var array_id = $scope.questions[k].array_id;
    current_array_ids.push(array_id);
    if ($scope.questions[k].USEALTERLISTFIELD == "name" || $scope.questions[k].USEALTERLISTFIELD == "email") {
      for (p in participantList) {
        var qIds = [];
        if (participantList[p].NAMEGENQIDS && participantList[p].NAMEGENQIDS.match(","))
          qIds = participantList[p].NAMEGENQIDS.split(",");
        else if (participantList[p].NAMEGENQIDS)
          qIds.push(participantList[p].NAMEGENQIDS);
        if (qIds.length != 0) {
          if ($.inArray($scope.questions[k].ID.toString(), qIds) != -1 && $.inArray(participantList[p][$scope.questions[k].USEALTERLISTFIELD.toUpperCase()], $scope.participants) == -1) {
            $scope.participants.push(participantList[p][$scope.questions[k].USEALTERLISTFIELD.toUpperCase()]);
          } else if ($scope.questions[k].SUBJECTTYPE == "EGO_ID") {
            $scope.participants.push(participantList[p][$scope.questions[k].USEALTERLISTFIELD.toUpperCase()]);
          }
        } else {
          if ($.inArray(participantList[p][$scope.questions[k].USEALTERLISTFIELD.toUpperCase()], $scope.participants) == -1)
            $scope.participants.push(participantList[p][$scope.questions[k].USEALTERLISTFIELD.toUpperCase()]);
        }
      }
    }
    if (Object.keys($scope.prevAlters).length > 0) {
      for (n in $scope.prevAlters) {
        if (study.RESTRICTALTERS) {
          if ($scope.participants.indexOf($scope.prevAlters[n].NAME) == -1)
            $scope.participants.push($scope.prevAlters[n].NAME);
        } else {
          $scope.participants.push($scope.prevAlters[n].NAME);
        }
      }
    }
    if (Object.keys($scope.listedAlters).length > 0) {
      for (n in $scope.listedAlters) {
        if (study.RESTRICTALTERS) {
          if ($.inArray($scope.listedAlters[n].NAME, $scope.participants) == -1)
            $scope.participants.push($scope.listedAlters[n].NAME);
        } else {
          $scope.participants.push($scope.listedAlters[n].NAME);
        }
      }
    }
    if (typeof $scope.questions[k].CITATION == "string")
      $scope.questions[k].CITATION = $sce.trustAsHtml(interpretTags($scope.questions[k].CITATION, $scope.questions[k].ALTERID1, $scope.questions[k].ALTERID2));

    if ($scope.questions[k].ALLBUTTON == true && !$scope.options["all"]) {
      $scope.options['all'] = $.extend(true, {}, options[$scope.questions[k].ID]);
      if ($scope.questions[k].DONTKNOWBUTTON == true) {
        var button = new Object;
        button.NAME = "No lo sé";
        button.ID = "DONT_KNOW";
        button.checked = false;
        $scope.options['all'][Object.keys($scope.options['all']).length] = button;
      }

      if ($scope.questions[k].REFUSEBUTTON == true) {
        var button = new Object;
        button.NAME = "Refuse";
        button.ID = "REFUSE";
        button.checked = false;
        $scope.options['all'][Object.keys($scope.options['all']).length] = button;
      }
    }
    $scope.options[array_id] = $.extend(true, {}, options[$scope.questions[k].ID]);
    if ($scope.questions[k].ASKINGSTYLELIST != false)
      $scope.askingStyleList = $scope.questions[k].array_id;
    if ($scope.askingStyleList != false)
      $scope.fixedWidth = "auto";
    else
      $scope.fixedWidth = "auto";

    if ($scope.subjectType == false) {
      $scope.subjectType = $scope.questions[k].SUBJECTTYPE;
      $scope.answerType = $scope.questions[k].ANSWERTYPE;;
      if (typeof $scope.questions[k].ID != "undefined")
        $scope.qId = $scope.questions[k].ID;
    }

    if ($scope.questions[k].ANSWERTYPE == "PREFACE") {
      $scope.hideQ = true;
      if (study.USEASALTERS == true) {
        $scope.participants = participantList['name'];
      }
    }

    if ($scope.questions[k].ANSWERTYPE == "NAME_GENERATOR") {
      if (typeof alterPrompts[$scope.questions[k].ID] != "undefined" && typeof alterPrompts[$scope.questions[k].ID][Object.keys($scope.alters).length] != "undefined")
        $scope.alterPrompt = alterPrompts[$scope.questions[k].ID][Object.keys($scope.alters).length];
    }
    for (o in $scope.options[array_id]) {
      $scope.options[array_id][o].checked = false;
      if (typeof answers[array_id] != "undefined") {
        var values = answers[array_id].VALUE.split(',');
        if (values.indexOf($scope.options[array_id][o].ID.toString()) != -1)
          $scope.options[array_id][o].checked = true;
      }
    }
    if (typeof $scope.answers[array_id] == "undefined") {
      $scope.answers[array_id] = new Object;
      $scope.answers[array_id].VALUE = "";
      $scope.answers[array_id].INTERVIEWID = interviewId;
      $scope.answers[array_id].SKIPREASON = "NONE";
    } else {
      if ($scope.answers[array_id].VALUE == study.VALUELOGICALSKIP || $scope.answers[array_id].VALUE == study.VALUENOTYETANSWERED)
        $scope.answers[array_id].VALUE = "";
    }
    if ($scope.questions[k].ANSWERTYPE == "TIME_SPAN") {
      $scope.time_spans[array_id] = new Object;
      if (answers[array_id] && answers[array_id].VALUE.match(/(\d*)\sYEARS/i))
        $scope.time_spans[array_id].YEARS = answers[array_id].VALUE.match(/(\d*)\sYEARS/i)[1];
      if (answers[array_id] && answers[array_id].VALUE.match(/(\d*)\sMONTHS/i))
        $scope.time_spans[array_id].MONTHS = answers[array_id].VALUE.match(/(\d*)\sMONTHS/i)[1];
      if (answers[array_id] && answers[array_id].VALUE.match(/(\d*)\sWEEKS/i))
        $scope.time_spans[array_id].WEEKS = answers[array_id].VALUE.match(/(\d*)\sWEEKS/i)[1];
      if (answers[array_id] && answers[array_id].VALUE.match(/(\d*)\sDAYS/i))
        $scope.time_spans[array_id].DAYS = answers[array_id].VALUE.match(/(\d*)\sDAYS/i)[1];
      if (answers[array_id] && answers[array_id].VALUE.match(/(\d*)\sHOURS/i))
        $scope.time_spans[array_id].HOURS = answers[array_id].VALUE.match(/(\d*)\sHOURS/i)[1];
      if (answers[array_id] && answers[array_id].VALUE.match(/(\d*)\sMINUTES/i))
        $scope.time_spans[array_id].MINUTES = answers[array_id].VALUE.match(/(\d*)\sMINUTES/i)[1];
    }

    if ($scope.questions[k].ANSWERTYPE == "DATE" && typeof answers[array_id] != "undefined") {
      $scope.dates[array_id] = new Object;
      var date = answers[array_id].VALUE.match(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}) (\d{4})/);
      var time = answers[array_id].VALUE.match(/(\d{1,2}):(\d{1,2}) (AM|PM)/);
      if (date && date.length > 3) {
        $scope.dates[array_id].YEAR = date[3];
        $scope.dates[array_id].MONTH = date[1];
        $scope.dates[array_id].DAY = date[2];
      }
      if (time && time.length > 2) {
        $scope.dates[array_id].HOUR = time[1];
        $scope.dates[array_id].MINUTE = time[2];
      }
      if (time && time.length > 3)
        $scope.dates[array_id].AMPM = time[3];
      else
        $scope.dates[array_id].AMPM = "";
    }

    if ($scope.questions[k].ANSWERTYPE == "MULTIPLE_SELECTION") {
      $scope.phrase = "Por favor, selecciona desde ";
      if ($scope.questions[k].MINCHECKABLEBOXES != null && $scope.questions[k].MINCHECKABLEBOXES != null && $scope.questions[k].MAXCHECKABLEBOXES != "" && $scope.questions[k].MINCHECKABLEBOXES == $scope.questions[k].MAXCHECKABLEBOXES)
        $scope.phrase += $scope.questions[k].MAXCHECKABLEBOXES;
      else if ($scope.questions[k].MINCHECKABLEBOXES != null && $scope.questions[k].MAXCHECKABLEBOXES != null && $scope.questions[k].MINCHECKABLEBOXES != $scope.questions[k].MAXCHECKABLEBOXES)
        $scope.phrase += $scope.questions[k].MINCHECKABLEBOXES + " hasta " + $scope.questions[k].MAXCHECKABLEBOXES;
      else if ($scope.questions[k].MINCHECKABLEBOXES == null && $scope.questions[k].MAXCHECKABLEBOXES != null)
        $scope.phrase += " hasta " + $scope.questions[k].MAXCHECKABLEBOXES;
      if ($scope.questions[k].MINCHECKABLEBOXES != null && $scope.questions[k].MAXCHECKABLEBOXES == null){
        $scope.phrase += " all that apply" //" at least " + $scope.questions[k].MINCHECKABLEBOXES;
      } else {
        if ($scope.questions[k].MAXCHECKABLEBOXES > 1 ||  $scope.questions[k].MINCHECKABLEBOXES > 1)
          $scope.phrase += " respuestas";
        else
          $scope.phrase += " respuesta";
      }
      if ($scope.questions[k].ASKINGSTYLELIST == 1 && $scope.questions[k].WITHLISTRANGE == false)
        $scope.phrase += " para cada fila";
    }

    if ($scope.questions[k].ANSWERTYPE == "NUMERICAL" && $scope.questions[k].SUBJECTTYPE != "EGO_ID") {
      var min = "";
      var max = "";
      if ($scope.questions[k].MINLIMITTYPE == "NLT_LITERAL") {
        min = $scope.questions[k].MINLITERAL;
      } else if ($scope.questions[k].MINLIMITTYPE == "NLT_PREVQUES") {
        if (typeof answers[$scope.questions[k].MINPREVQUES] != "undefined")
          min = answers[$scope.questions[k].MINPREVQUES].VALUE;
        else
          min = "";
      }
      if ($scope.questions[k].MAXLIMITTYPE == "NLT_LITERAL") {
        max = $scope.questions[k].MAXLITERAL;
      } else if ($scope.questions[k].MAXLIMITTYPE == "NLT_PREVQUES") {
        if (typeof answers[$scope.questions[k].MAXPREVQUES] != "undefined")
          max = answers[$scope.questions[k].MAXPREVQUES].VALUE;
        else
          max = "";
      }

      if (min != "" && max != "")
        $scope.phrase = "Por favor, ingresa un número de " + min + " hasta " + max;
      else if (min == "" && max != "")
        $scope.phrase = "Por favor, ingresa un número (" + max + " o menor)";
      else if (min != "" && max == "")
        $scope.phrase = "Por favor, ingresa un número (" + min + " o mayor)";
      if ($scope.questions[k].ASKINGSTYLELIST == 1 && $scope.questions[k].WITHLISTRANGE == false && $scope.phrase != "" && !$scope.phrase.match("por cada fila"))
        $scope.phrase += " por cada fila";
    }
    if($scope.questions[k].ANSWERTYPE == "TEXTUAL" || $scope.questions[k].ANSWERTYPE == "TEXTUAL_PP")
      $scope.answers[array_id].VALUE = htmldecode($scope.answers[array_id].VALUE);

    if ($scope.questions[k].DONTKNOWBUTTON == true) {
      var button = new Object;
      button.NAME = "No Sé";
      button.ID = "DONT_KNOW";
      button.checked = false;
      if ($scope.answers[array_id].SKIPREASON == "DONT_KNOW")
        button.checked = true;
      $scope.options[array_id][Object.keys($scope.options[array_id]).length] = button;
    }

    if ($scope.questions[k].REFUSEBUTTON == true) {
      var button = new Object;
      button.NAME = "Prefiero no responder";
      button.ID = "REFUSE";
      $scope.hasRefuse = true;
      button.checked = false;
      if ($scope.answers[array_id].SKIPREASON == "REFUSE")
        button.checked = true;
      $scope.options[array_id][Object.keys($scope.options[array_id]).length] = button;
    }
    if ($scope.colspan == false) {
      $scope.colspan = 1
      $scope.colspan = $scope.colspan + Object.keys($scope.options[array_id]).length;
      if ($scope.askingStyleList != false && ($scope.questions[k].ANSWERTYPE == "NUMERICAL" || $scope.questions[k].ANSWERTYPE == "TEXTUAL")) {
        $scope.colspan = $scope.colspan + 1;
      }
    }
    if (typeof $scope.answers[array_id].OTHERSPECIFYTEXT != "undefined" && $scope.answers[array_id].OTHERSPECIFYTEXT != null && $scope.answers[array_id].OTHERSPECIFYTEXT != "") {
      $scope.otherSpecify[array_id] = {};
      var specify = $scope.answers[array_id].OTHERSPECIFYTEXT.split(";;");
      for (s in specify) {
        var pair = specify[s].split(":");
        $scope.otherSpecify[array_id][pair[0]] = pair[1];
      }
    }
    for (a in $scope.options[array_id]) {
      if (typeof $scope.otherSpecify[array_id] == "undefined")
        $scope.otherSpecify[array_id] = {};
      if ($scope.otherSpecify[array_id][$scope.options[array_id][a].ID] && $scope.otherSpecify[array_id][$scope.options[array_id][a].ID] != "")
        continue;
      if ($scope.options[array_id][a].OTHERSPECIFY == true)
        $scope.otherSpecify[array_id][$scope.options[array_id][a].ID] = "";
      else if ($scope.options[array_id][a].NAME.match(/OTHER \(*SPECIFY\)*/i))
        $scope.otherSpecify[array_id][$scope.options[array_id][a].ID] = "";
      else
        $scope.otherSpecify[array_id][$scope.options[array_id][a].ID] = false;
    }

    if ($scope.questions[k].SUBJECTTYPE != "EGO_ID") {
      $scope.prompt = $sce.trustAsHtml(interpretTags($scope.questions[k].PROMPT, $scope.questions[k].ALTERID1, $scope.questions[k].ALTERID2) + '<br><div class="orangeText">' + $scope.phrase + "</div>");
    } else {
      $scope.prompt = $sce.trustAsHtml(study.EGOIDPROMPT);
      $scope.questions[k].PROMPT = $scope.questions[k].PROMPT.replace(/(<([^>]+)>)/ig, '');
    }

    if ($scope.questions[k].SUBJECTTYPE == "NETWORK") {
      var expressionId = $scope.questions[k].NETWORKRELATIONSHIPEXPRID;
      notes = [];
      if (typeof otherGraphs[$scope.questions[k].TITLE] != "undefined")
        $scope.otherGraphs = otherGraphs[$scope.questions[k].TITLE];
      if (typeof graphs[expressionId] != "undefined") {
        $scope.graphId = graphs[expressionId].ID;
        $scope.graphExpressionId = graphs[expressionId].EXPRESSIONID;
        graphExpressionId = $scope.graphExpressionId;
        $scope.graphInterviewId = graphs[expressionId].INTERVIEWID;
        $scope.graphNodes = graphs[expressionId].NODES;
        $scope.graphParams = $scope.questions[k].NETWORKPARAMS;
        if (typeof allNotes[expressionId] != "undefined")
          notes = allNotes[expressionId];
      } else {
        $scope.graphExpressionId = $scope.questions[k].NETWORKRELATIONSHIPEXPRID;
        graphExpressionId = $scope.graphExpressionId;
        if (typeof allNotes[graphExpressionId] != "undefined")
          notes = allNotes[graphExpressionId];
        $scope.graphInterviewId = interviewId;
        $scope.graphParams = $scope.questions[k].NETWORKPARAMS;

      }
      if ($scope.questions[k].USELFEXPRESSION && parseInt($scope.questions[k].USELFEXPRESSION) != 0)
        $scope.starExpressionId = parseInt($scope.questions[k].USELFEXPRESSION);
      initStats($scope.questions[k]);
    }
    setTimeout(
      function () {
        eval($scope.questions[k].JAVASCRIPT);
        if (typeof $(".answerInput")[0] != "undefined")
          $(".answerInput")[0].focus();
        if (!isGuest && $("#menu_" + $scope.page).length != 0)
          $("#second").scrollTop($("#second").scrollTop() - $("#second").offset().top + $("#menu_" + $scope.page).offset().top);
      },
      1);
  }

  setTimeout(function () {

    if ($scope.askingStyleList != false && $(window).width() >= 480) {
      console.log("fixing header")
      $("table.qTable").floatThead({ top:  parseInt($("#content").css("margin-top")) })
      window.scrollTo(0, 0);
      $(window).resize();
    } else {
      //    $("#realHeader").css("display","none");
      //$("#floater").hide();
      //unfixHeader();
      //$("#realHeader").css("height","1px");

      //      $("#realHeader").height(1);
    }
    //$(window).scrollTop(0);
    window.scrollTo(0, 0);
    eval(study.JAVASCRIPT);
  }, 100);

  $scope.errors = new Object;

  $scope.print = function (e_Id, i_Id, params) {
    if (typeof e_Id == "undefined")
      e_Id = $scope.graphExpressionId;
    if (typeof i_Id == "undefined")
      i_Id = interviewId;
    if ($scope.starExpressionId == false)
      s_Id = "";
    else
      s_Id = "&starExpressionId=" + $scope.starExpressionId;
    url = "/data/visualize?print&expressionId=" + e_Id + "&interviewId=" + i_Id + s_Id + "&params=" + encodeURIComponent(params) + "&labelThreshold=" + s.renderers[0].settings("labelThreshold");
    window.open(url);
  }

  $scope.playSound = function (file) {
    $scope.audioFiles[file].play();
  }

  $scope.goBack = function () {
    var url = $location.absUrl().replace($location.url(), '');
    url = url + "page/" + (parseInt($routeParams.page) - 1);
    if (typeof hashKey != "undefined")
      url = url + "/" + hashKey;
    document.location = url;
  }

  $scope.submitForm = function (isValid) {
    // check to make sure the form is completely valid
    console.log(isValid)
    if (isValid || $scope.refuseCount > 0) {
      for(r in current_array_ids){
        if($scope.refuseCount > 0 && $scope.answers[current_array_ids[r]].SKIPREASON == "NONE" && $('#Answer_' + current_array_ids[r] + '_VALUE').val() == ""){
          $scope.answers[current_array_ids[r]].SKIPREASON = "REFUSE";
          $('input[name="Answer[' + current_array_ids[r] + '][skipReason]').val("REFUSE");
          $scope.answerForm.$setDirty();
        }
      }
      save($scope.questions, $routeParams.page, $location.absUrl().replace($location.url(), ''), $scope);
    } else {
      if($scope.hasRefuse)
        $scope.refuseCount++;
      window.scrollTo(0, 0);
      $("table.qTable").floatThead('reflow');
    }
  };

  $scope.addAlter = function (isValid) {
    $scope.errors[0] = false;
    for (k in $scope.alters) {
      if ($("#Alters_name").val().toLowerCase() == $scope.alters[k].NAME.toLowerCase()) {
        if($scope.questions[0].NONEBUTTON != true)
          $scope.errors[0] = 'El nombre ya fue enlistado.';
        if ($scope.alters[k].NAMEGENQIDS != null)
          var nameGenQIds = $scope.alters[k].NAMEGENQIDS.split(",");
        if (nameGenQIds.indexOf($("#Alters_nameGenQIds").val()) > -1)
          $scope.errors[0] = 'El nombre ya existe en la lista.';
      }
    }

    // check pre-defined participant list
    if ($scope.participants.length > 0 && $scope.questions[0].RESTRICTLIST == true) {
      if ($scope.participants.indexOf($("#Alters_name").val().trim()) == -1) {
        $scope.errors[0] = 'Nombre no encontrado en la lista';
      }
    }

    if ($("#Alters_name").val().trim() == "") {
      $scope.errors[0] = 'El nombre no puede estar en blanco';
    }

    // check to make sure the form is completely valid
    if ($scope.errors[0] == false) {
      saveAlter.getAlters().then(function (data) {
        alters = JSON.parse(data);
        for (k in alters) {
          if (typeof prevAlters[k] != "undefined") {
            deletedPrevAlters[k] = $.extend(true, {}, prevAlters[k]);
            delete prevAlters[k];
          }
        }
        for (k in alters) {
          if (typeof $scope.listedAlters[k] != "undefined")
            delete $scope.listedAlters[k];
        }
        masterList = [];
        $route.reload();
      });
    }
  };

  $scope.removeAlter = function (alterId, nameGenQId) {
    $("#deleteAlterId").val(alterId);
    $("#deleteNameGenQId").val(nameGenQId);
    // check to make sure the form is completely valid
    deleteAlter.getAlters().then(function (data) {
      alters = JSON.parse(data);
      if (typeof deletedPrevAlters[alterId] != "undefined" && typeof prevAlters[alterId] == "undefined" && typeof alters[alterId] == "undefined") {
        prevAlters[alterId] = $.extend(true, {}, deletedPrevAlters[alterId]);
        $scope.prevAlters = prevAlters;
        delete deletedPrevAlters[alterId];
      }
      masterList = [];
      $route.reload();
    });
  };

  $scope.unSkip = function (array_id) {
    if (typeof $scope.answers[array_id].VALUE != "undefined" && $scope.answers[array_id].VALUE != "" && $scope.answers[array_id].VALUE != "SKIPREASON") {
      for (k in $scope.options[array_id]) {
        $scope.options[array_id][k].checked = false;
      }
      $scope.answers[array_id].SKIPREASON = "NONE";
    }
  }

  $scope.changeOther = function (array_id) {
    var specify = [];
    for (a in $scope.options[array_id]) {
      if ($scope.otherSpecify[array_id][$scope.options[array_id][a].ID] != false && $scope.otherSpecify[array_id][$scope.options[array_id][a].ID] != "") {
        specify.push($scope.options[array_id][a].ID + ":" + $scope.otherSpecify[array_id][$scope.options[array_id][a].ID])
      }
    }
    $scope.answers[array_id].OTHERSPECIFYTEXT = specify.join(";;");
    //console.log($scope.answers[array_id].OTHERSPECIFYTEXT);
  }

  $scope.multiSelect = function (v, index, array_id) {

    if (typeof $scope.questions[array_id] != "undefined")
      var question = $scope.questions[array_id];
    else
      var question = questions[$scope.options[array_id][index].QUESTIONID];
    if ($scope.answers[array_id].VALUE)
      values = $scope.answers[array_id].VALUE.split(',');
    else
      values = [];

    if (v == "DONT_KNOW" || v == "REFUSE") {
      if ($scope.options[array_id][index].checked) {
        for (k in $scope.options[array_id]) {
          if (k != index)
            $scope.options[array_id][k].checked = false;
        }
        $scope.answers[array_id].OTHERSPECIFYTEXT = "";
        $scope.answers[array_id].SKIPREASON = v;
        if (typeof $scope.dates[array_id] != "undefined") {
          $scope.dates[array_id].MINUTE = "";
          $scope.dates[array_id].HOUR = "";
          $scope.dates[array_id].DAY = "";
          $scope.dates[array_id].MONTH = "";
          $scope.dates[array_id].AMPM = "";
          $scope.dates[array_id].YEAR = "";
        }
        if (typeof $scope.errors[array_id] != "undefined")
          delete $scope.errors[array_id];
        if (typeof $scope.errors[0] != "undefined")
          delete $scope.errors[0];
        $('#Answer_' + array_id + '_VALUE').val("SKIPREASON").change();
        $('#Answer_' + array_id + '_VALUE').val("").change();
      } else {
        $scope.answers[array_id].SKIPREASON = "NONE";
        $('#Answer_' + array_id + '_VALUE').val("SKIPREASON").change();
        $('#Answer_' + array_id + '_VALUE').val("").change();
      }
    } else {
      if ($scope.options[array_id][index].checked) {
        $scope.answers[array_id].SKIPREASON = "NONE";
        for (k in $scope.options[array_id]) {
          if ($scope.options[array_id][k].ID == "DONT_KNOW" || $scope.options[array_id][k].ID == "REFUSE" )
            $scope.options[array_id][k].checked = false;
          if($scope.options[array_id][index].SINGLE == true && k != index)
            $scope.options[array_id][k].checked = false;
          if ($scope.options[array_id][k].SINGLE == true && k != index){
            $scope.options[array_id][k].checked = false;
            if (values.indexOf($scope.options[array_id][k].ID) != -1) {
              values.splice(values.indexOf($scope.options[array_id][k].ID), 1);
            }
          }
    
        }
        if ($scope.options[array_id][index].SINGLE == true)
          values = [v.toString()];
        if (values.indexOf(v.toString()) == -1)
          values.push(v.toString());
      } else {
        if ($scope.otherSpecify[$scope.options[array_id][index].ID] != false) {
          $scope.otherSpecify[$scope.options[array_id][index].ID] = "";
          $scope.changeOther(array_id);
        }
        if (values.indexOf(v.toString()) != -1) {
          values.splice(values.indexOf(v), 1);
        }
      }
      if (question.MAXCHECKABLEBOXES != null && values.length > question.MAXCHECKABLEBOXES) {
        value = values.shift();
        for (k in $scope.options[array_id]) {
          if ($scope.options[array_id][k].ID == value)
            $scope.options[array_id][k].checked = false;
        }
      }
      $scope.answers[array_id].VALUE = values.join(',');
    }

  }

  $scope.setAll = function (v, index) {
    for (k in $scope.questions) {
      var array_id = $scope.questions[k].array_id;
      if ($scope.answers[array_id].VALUE == undefined)
        $scope.answers[array_id].VALUE = "";
      if (
        ($scope.answers[array_id].VALUE == "" && $scope.answers[array_id].SKIPREASON == "NONE" && $scope.options['all'][index].checked == true) ||
        ((($scope.answers[array_id].VALUE != "" && $.inArray(v.toString(), $scope.answers[array_id].VALUE.split(",")) != -1) || ($scope.answers[array_id].SKIPREASON != "" && $.inArray(v.toString(), $scope.answers[array_id].SKIPREASON.split(",")) != -1)) && $scope.options['all'][index].checked == false)

      ) {
        $scope.options[array_id][index].checked = $scope.options['all'][index].checked;
        $scope.multiSelect(v, index, k);
      }
    }
  }

  $scope.timeValue = function (array_id) {
    var date = [];
    $scope.answers[array_id].VALUE = "";
    //alert($scope.time_spans[array_id].YEARS)
    if (!isNaN($scope.time_spans[array_id].YEARS) && $scope.time_spans[array_id].YEARS)
      date.push($scope.time_spans[array_id].YEARS + ' YEARS');
    if (!isNaN($scope.time_spans[array_id].MONTHS) && $scope.time_spans[array_id].MONTHS)
      date.push($scope.time_spans[array_id].MONTHS + ' MONTHS');
    if (!isNaN($scope.time_spans[array_id].WEEKS) && $scope.time_spans[array_id].WEEKS)
      date.push($scope.time_spans[array_id].WEEKS + ' WEEKS');
    if (!isNaN($scope.time_spans[array_id].DAYS) && $scope.time_spans[array_id].DAYS)
      date.push($scope.time_spans[array_id].DAYS + ' DAYS');
    if (!isNaN($scope.time_spans[array_id].HOURS) && $scope.time_spans[array_id].HOURS)
      date.push($scope.time_spans[array_id].HOURS + ' HOURS');
    if (!isNaN($scope.time_spans[array_id].MINUTES) && $scope.time_spans[array_id].MINUTES)
      date.push($scope.time_spans[array_id].MINUTES + ' MINUTES');
    if(date.length > 0){
      $scope.answers[array_id].VALUE = date.join("; ");
      //alert($scope.answers[array_id].VALUE)
      $scope.answers[array_id].SKIPREASON = "NONE";
      for (k in $scope.options[array_id]) {
        if ($scope.options[array_id][k].ID == "DONT_KNOW" || $scope.options[array_id][k].ID == "REFUSE")
          $scope.options[array_id][k].checked = false;
      }
    }
  }

  $scope.dateValue = function (array_id) {
    var date = "";
    if ($scope.dates[array_id].MONTH)
      date += $scope.dates[array_id].MONTH + ' ';
    if ($scope.dates[array_id].DAY)
      date += $scope.dates[array_id].DAY + ' ';
    if (!isNaN($scope.dates[array_id].YEAR))
      date += $scope.dates[array_id].YEAR + ' ';
    if (!isNaN($scope.dates[array_id].HOUR))
      date += $scope.dates[array_id].HOUR + ':';
    if (!isNaN($scope.dates[array_id].MINUTE)) {
      if ($scope.dates[array_id].MINUTE.toString().length < 2)
        $scope.dates[array_id].MINUTE = '0' + $scope.dates[array_id].MINUTE;
      date += $scope.dates[array_id].MINUTE + ' ';
    }
    if ($scope.dates[array_id].AMPM)
      date += $scope.dates[array_id].AMPM;
    $scope.answers[array_id].VALUE = date;
    $scope.answers[array_id].SKIPREASON = "NONE";
    for (k in $scope.options[array_id]) {
      if ($scope.options[array_id][k].ID == "DONT_KNOW" || $scope.options[array_id][k].ID == "REFUSE")
        $scope.options[array_id][k].checked = false;
    }

  }

  $scope.timeBits = function (timeUnits, span) {
    timeArray = [];
    bitVals = {
      'BIT_YEAR': 1,
      'BIT_MONTH': 2,
      'BIT_WEEK': 4,
      'BIT_DAY': 8,
      'BIT_HOUR': 16,
      'BIT_MINUTE': 32,
    };
    for (var k in bitVals) {
      if (timeUnits & bitVals[k]) {
        timeArray.push(k);
      }
    }

    if ($.inArray("BIT_" + span, timeArray) != -1)
      return true;
    else
      return false;
  }
}]);

app.directive('checkAnswer', [function () {
  return {
    require: 'ngModel',
    link: function (scope, elem, attr, ngModel) {
      //For DOM . model validation
      ngModel.$parsers.unshift(function (value) {
        var valid = true;
        var array_id = attr.arrayId;
        var question = questions[attr.questionId];
        console.log(question);
        console.log("check:" + value);

        if (attr.answerType == "NAME_GENERATOR") {
          if ((typeof scope.answers[array_id] != "undefined" && scope.answers[array_id].SKIPREASON != "REFUSE" && scope.answers[array_id].SKIPREASON != "DONT_KNOW" || typeof scope.answers[array_id] == "undefined") && Object.keys(scope.nGalters).length < scope.questions[0].MINLITERAL) {
            var noun = " people";
            if(scope.questions[0].MINLITERAL == 1)
              noun = " person";
            scope.errors[array_id] = 'Por favor, lista al menos ' + scope.questions[0].MINLITERAL + noun + ".";
            valid = false;
          } else {
            delete scope.errors[0];
            delete scope.errors[array_id];
            delete scope.answerForm.$error.checkAnswer;
          }
        }

        if (attr.answerType == "TEXTUAL") {
          if (scope.answers[array_id].SKIPREASON != "REFUSE" && scope.answers[array_id].SKIPREASON != "DONT_KNOW") {
            if (value == "") {
              scope.errors[array_id] = "Value cannot be blank.";
              valid = false;
            } else {
              delete scope.errors[array_id];
            }
          } else {
            delete scope.errors[array_id];
          }
        }

        if (attr.answerType == "NUMERICAL") {
          var min = "";
          var max = "";
          var numberErrors = 0;
          var showError = false;
          if ((value == "" && scope.answers[array_id].SKIPREASON == "NONE") || (value != "" && isNaN(parseInt(value)))) {
            errorMsg = 'Por favor, ingresa un número.';
            showError = true;
          }
          if (question.MINLIMITTYPE == "NLT_LITERAL") {
            min = question.MINLITERAL;
          } else if (question.MINLIMITTYPE == "NLT_PREVQUES") {
            min = scope.answers[question.MINPREVQUES].VALUE;
          }
          if (question.MAXLIMITTYPE == "NLT_LITERAL") {
            max = question.MAXLITERAL;
          } else if (question.MAXLIMITTYPE == "NLT_PREVQUES") {
            max = scope.answers[question.MAXPREVQUES].VALUE;
          }
          if (min !== "")
            numberErrors++;
          if (max !== "")
            numberErrors = numberErrors + 2;
          if (((max !== "" && parseInt(value) > parseInt(max)) || (min !== "" && parseInt(value) < parseInt(min))) && scope.answers[array_id].SKIPREASON == "NONE")
            showError = true;

          if (numberErrors == 3)
            errorMsg = "El rango de respuestas válidas es " + min + " hasta " + max + ".";
          else if (numberErrors == 2)
            errorMsg = "El rango de respuestas válidas es " + max + " o menor.";
          else if (numberErrors == 1)
            errorMsg = "El rango de respuestas válidas es " + min + " o mayor.";

          if (showError) {
            scope.errors[array_id] = errorMsg;
            valid = false;
          } else {
            delete scope.errors[array_id];
          }
        }

        if (attr.answerType == "DATE") {
          if (scope.answers[array_id].SKIPREASON != "REFUSE" && scope.answers[array_id].SKIPREASON != "DONT_KNOW") {
            var date = value.match(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}) (\d{4})/);
            var month = value.match(/January|February|March|April|May|June|July|August|September|October|November|December/);
            var year = value.match(/\d{4}/);
            var time = value.match(/(\d+):(\d+) (AM|PM)/);
            if (time && time.length > 2) {
              if (parseInt(time[1]) < 1 || parseInt(time[1]) > 12) {
                scope.errors[array_id] = 'Please enter 1 to 12 for HH.';
                valid = false;
              }
              if (parseInt(time[2]) < 0 || parseInt(time[2]) > 59) {
                scope.errors[array_id] = 'Please enter 0 to 59 for MM.';
                valid = false;
              }
            } else {
              if (scope.timeBits(question.TIMEUNITS, 'MINUTE')) {
                scope.errors[array_id] = 'Please enter the minutes.';
                valid = false;
              }
              if (scope.timeBits(question.TIMEUNITS, 'HOUR')) {
                scope.errors[array_id] = 'Please enter the time of day.';
                valid = false;
              }
            }
            if (scope.timeBits(question.TIMEUNITS, 'YEAR') && !year) {
              scope.errors[array_id] = 'Please enter a valid year.';
              valid = false;
            }
            if (scope.timeBits(question.TIMEUNITS, 'MONTH') && !month) {
              scope.errors[array_id] = 'Please enter a month.';
              valid = false;
            }
            if (scope.timeBits(question.TIMEUNITS, 'MONTH') && scope.timeBits(question.TIMEUNITS, 'YEAR') && scope.timeBits(question.TIMEUNITS, 'DAY') && year && !date) {
              scope.errors[array_id] = 'Please enter a day of the month.';
              valid = false;
            }
            if (date) {
              if (parseInt(date[2]) < 1 || parseInt(date[2]) > 31) {
                scope.errors[array_id] = 'Please enter a different number for the day of month.';
                valid = false;
              }
            }
            if (valid == true)
              delete scope.errors[array_id];
          } else {
            delete scope.errors[array_id];
          }
        }

        if (attr.answerType == "TIME_SPAN") {
          if (scope.answers[array_id].SKIPREASON != "REFUSE" && scope.answers[array_id].SKIPREASON != "DONT_KNOW") {
            if(value.trim() == ""){
              scope.errors[array_id] = 'Please fill in at least one of the fields.';
              valid = false;            }
          } else {
            delete scope.errors[array_id];
          }
        }

        if (attr.answerType == "MULTIPLE_SELECTION") {
          var showError = false;
          min = question.MINCHECKABLEBOXES;
          max = question.MAXCHECKABLEBOXES;
          var numberErrors = 0;
          var showError = false;
          var errorMsg = "";
          if (min !== null && min != null)
            numberErrors++;
          if (max !== null && max != null)
            numberErrors = numberErrors + 2;

          checkedBoxes = value.split(',').length;
          if (!value)
            checkedBoxes = 0;

          if (numberErrors != 0 && (checkedBoxes < min || checkedBoxes > parseInt(max)) && scope.answers[array_id].SKIPREASON == "NONE")
            showError = true;
          //console.log('min:' + min + ':max:' + max + ':checked:' + checkedBoxes+ ":answer:" + value + ":showerror:" + showError);

          adds = '';
          if (max != 1)
            adds = 's';
          if (parseInt(question.ASKINGSTYLELIST) == 1)
            adds += ' por cada fila';
          if (numberErrors == 3 && min == max && showError)
            errorMsg = "Selecciona " + max + " respuesta" + adds + " por favor.";
          else if (numberErrors == 3 && min != max && showError)
            errorMsg = "Selecciona de " + min + " a " + max + " respuesta" + adds + " por favor.";
          else if (numberErrors == 2 && showError)
            errorMsg = "Puedes seleccionar hasta " + max + " respuesta" + adds + " por favor.";
          else if (numberErrors == 1 && showError)
            errorMsg = "Debes seleccionar al menos " + min + " respuesta" + adds + " porfavor.";
          //if(answer.OTHERSPECIFYTEXT && showError)
          //	showError = false;

          if (showError) {
            scope.errors[array_id] = errorMsg;
            valid = false;
          }

          // check for list range limitations
          var checks = 0;
          if (typeof question != "undefined" && parseInt(question.WITHLISTRANGE) != 0) {
            for (i in scope.answers) {
              if (scope.answers[i].VALUE.split(',').indexOf(question.LISTRANGESTRING) != -1) {
                checks++;
              }
            }
            //console.log("check list range: " + checks);

            if (checks < question.MINLISTRANGE || checks > question.MAXLISTRANGE) {
              errorMsg = "";
              if (question.MINLISTRANGE && question.MAXLISTRANGE) {
                if (question.MINLISTRANGE != question.MAXLISTRANGE)
                  errorMsg = question.MINLISTRANGE + " - " + question.MAXLISTRANGE;
                else
                  errorMsg = "just " + question.MINLISTRANGE;
              } else if (!question.MINLISTRANGE && !question.MAXLISTRANGE) {
                errorMsg = "up to " + question.MAXLISTRANGE;
              } else {
                errorMsg = "at least " + question.MINLISTRANGE;
              }

              valid = false;
              scope.errors[array_id] = "Please select " + errorMsg + " response(s).  You selected " + checks + ".";

            } else {
              for (k in scope.errors) {
                if (scope.errors[k].match("Please select "))
                  delete scope.errors[k];
              }
            }
          }
        }
        if(typeof scope.errors[0] == "undefined" && Object.keys(scope.errors).length > 0){

          for(k in scope.errors){
            if(scope.hasRefuse && !scope.errors[k].match("again to skip to the next question")){
              scope.errors[k] += " Click \"Next\" again to skip to the next question.";
              break;
            }
          }
        }
        $("table.qTable").floatThead('reflow');
        ngModel.$setValidity('checkAnswer', valid);
        return valid ? value : undefined;
      });

      ngModel.$formatters.unshift(function (value) {
        var valid = true;
        var array_id = attr.arrayId;
        var question = questions[attr.questionId];
        if (attr.answerType == "NAME_GENERATOR") {
          if ((typeof scope.answers[array_id] != "undefined" && scope.answers[array_id].SKIPREASON != "REFUSE" && scope.answers[array_id].SKIPREASON != "DONT_KNOW" || typeof scope.answers[array_id] == "undefined") && Object.keys(scope.nGalters).length < scope.questions[0].MINLITERAL) {
            var noun = " people";
            if(scope.questions[0].MINLITERAL == 1)
              noun = " person";
            scope.errors[array_id] = 'Please list at least ' + scope.questions[0].MINLITERAL + noun + ".";
            valid = false;
          } else {
            delete scope.errors[0];
            delete scope.errors[array_id];
            delete scope.answerForm.$error.checkAnswer;
          }
        }

        if (attr.answerType == "TEXTUAL") {
          if (scope.answers[array_id].SKIPREASON != "REFUSE" && scope.answers[array_id].SKIPREASON != "DONT_KNOW") {
            if (value == "") {
              scope.errors[array_id] = "El valor no puede estar vacío.";
              valid = false;
            } else {
              delete scope.errors[array_id];
            }
          } else {
            delete scope.errors[array_id];
          }
        }
        if (attr.answerType == "NUMERICAL") {
          var min = "";
          var max = "";
          var numberErrors = 0;
          var showError = false;
          if ((value == "" && scope.answers[array_id].SKIPREASON == "NONE") || (value != "" && isNaN(parseInt(value)))) {
            scope.errors[array_id] = 'Por favor, ingresa un número.';
            valid = false;
          }
          if (question.MINLIMITTYPE == "NLT_LITERAL") {
            min = question.MINLITERAL;
          } else if (question.MINLIMITTYPE == "NLT_PREVQUES") {
            min = scope.answers[question.MINPREVQUES].VALUE;
          }
          if (question.MAXLIMITTYPE == "NLT_LITERAL") {
            max = question.MAXLITERAL;
          } else if (question.MAXLIMITTYPE == "NLT_PREVQUES") {
            max = scope.answers[question.MAXPREVQUES].VALUE;
          }
          if (min !== "")
            numberErrors++;
          if (max !== "")
            numberErrors = numberErrors + 2;
          if (((max !== "" && parseInt(value) > parseInt(max)) || (min !== "" && parseInt(value) < parseInt(min))) && scope.answers[array_id].SKIPREASON == "NONE")
            showError = true;

          if (numberErrors == 3 && showError)
            errorMsg = "El rango de respuestas válidas es desde " + min + " hasta " + max + ".";
          else if (numberErrors == 2 && showError)
            errorMsg = "El rango de respuestas válidas es desde " + max + " o menor.";
          else if (numberErrors == 1 && showError)
            errorMsg = "El rango de respuestas válidas es desde " + min + " o mayor.";

          if (showError) {
            scope.errors[array_id] = errorMsg;
            valid = false;
          }
        }

        if (attr.answerType == "DATE") {
          //console.log(scope.timeUnits);
          if (scope.answers[array_id].SKIPREASON != "REFUSE" && scope.answers[array_id].SKIPREASON != "DONT_KNOW") {
            var date = value.match(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}) (\d{4})/);
            var month = value.match(/January|February|March|April|May|June|July|August|September|October|November|December/);
            var year = value.match(/\d{4}/);
            var time = value.match(/(\d+):(\d+) (AM|PM)/);
            if (time && time.length > 2) {
              if (parseInt(time[1]) < 1 || parseInt(time[1]) > 12) {
                scope.errors[array_id] = 'Por favor, ingresa 1 hasta 12 en HH.';
                valid = false;
              }
              if (parseInt(time[2]) < 0 || parseInt(time[2]) > 59) {
                scope.errors[array_id] = 'Por favor, ingresa 0 hasta 59 en MM.';
                valid = false;
              }
            } else {
              if (scope.timeBits(question.TIMEUNITS, 'MINUTE')) {
                scope.errors[array_id] = 'Por favor, ingresa los minutos.';
                valid = false;
              }
              if (scope.timeBits(question.TIMEUNITS, 'HOUR')) {
                scope.errors[array_id] = 'Por favor, ingresa la hora del día.';
                valid = false;
              }
            }
            if (scope.timeBits(question.TIMEUNITS, 'YEAR') && !year) {
              scope.errors[array_id] = 'Por favor, ingresa un año válido.';
              valid = false;
            }
            if (scope.timeBits(question.TIMEUNITS, 'MONTH') && !month) {
              scope.errors[array_id] = 'Por favor, ingresa un mes.';
              valid = false;
            }
            if (scope.timeBits(question.TIMEUNITS, 'MONTH') && scope.timeBits(question.TIMEUNITS, 'YEAR') && scope.timeBits(question.TIMEUNITS, 'DAY') && year && !date) {
              scope.errors[array_id] = 'Por favor, ingresa un día del mes.';
              valid = false;
            }
            if (date) {
              if (parseInt(date[2]) < 1 || parseInt(date[2]) > 31) {
                scope.errors[array_id] = 'Por favor, ingrsa un día del mes distinto.';
                valid = false;
              }
            }
            if (valid == true)
              delete scope.errors[array_id];
          } else {
            delete scope.errors[array_id];
          }
        }

        if (attr.answerType == "TIME_SPAN") {
          if (scope.answers[array_id].SKIPREASON != "REFUSE" && scope.answers[array_id].SKIPREASON != "DONT_KNOW") {
            if(value.trim() == ""){
              scope.errors[array_id] = 'Por favor, llena uno de los campos.';
              valid = false;            }
          } else {
            delete scope.errors[array_id];
          }
        }
  
        if (attr.answerType == "MULTIPLE_SELECTION") {
          var showError = false;
          min = question.MINCHECKABLEBOXES;
          max = question.MAXCHECKABLEBOXES;
          var numberErrors = 0;
          var showError = false;
          var errorMsg = "";
          if (min !== "" && min != null)
            numberErrors++;
          if (max !== "" && max != null)
            numberErrors = numberErrors + 2;

          checkedBoxes = value.split(',').length;
          if (!value)
            checkedBoxes = 0;

          if (numberErrors != 0 && (checkedBoxes < min || checkedBoxes > parseInt(max)) && scope.answers[array_id].SKIPREASON == "NONE")
            showError = true;

          //console.log('min:' + min + ':max:' + max + ':checked:' + checkedBoxes+ ":answer:" + value + ":showerror:" + showError);

          adds = '';
          if (max != 1)
            adds = 's';
          if (parseInt(question.ASKINGSTYLELIST) == 1)
            adds += ' por cada fila';
          if (numberErrors == 3 && min == max && showError)
            errorMsg = "Selecciona  " + max + " respuesta" + adds + " por favor.";
          else if (numberErrors == 3 && min != max && showError)
            errorMsg = "Selecciona " + min + " to " + max + " respuesta" + adds + " por favor.";
          else if (numberErrors == 2 && showError)
            errorMsg = "Puedes seleccionar hasta " + max + " respuesta" + adds + " por favor.";
          else if (numberErrors == 1 && showError)
            errorMsg = "Debes seleccionar al menos " + min + " respuesta" + adds + " por favor.";
          //if(answer.OTHERSPECIFYTEXT && showError)
          //	showError = false;

          if (showError) {
            scope.errors[array_id] = errorMsg;
            valid = false;
          } else {
            if (typeof scope.errors[array_id] != "undefined")
              delete scope.errors[array_id];
            valid = true;
          }
          // check for list range limitations
          var checks = 0;
          if (typeof question != "undefined" && parseInt(question.WITHLISTRANGE) != 0) {
            for (i in scope.answers) {
              console.log(scope.answers[i].VALUE + ":" + question.LISTRANGESTRING);
              if (scope.answers[i].VALUE.split(',').indexOf(question.LISTRANGESTRING) != -1) {
                checks++;
              }
            }

            //console.log("check list range: " + checks);

            if (checks < question.MINLISTRANGE || checks > question.MAXLISTRANGE) {
              errorMsg = "";
              if (question.MINLISTRANGE && question.MAXLISTRANGE) {
                if (question.MINLISTRANGE != question.MAXLISTRANGE)
                  errorMsg = question.MINLISTRANGE + " - " + question.MAXLISTRANGE;
                else
                  errorMsg = "just " + question.MINLISTRANGE;
              } else if (!question.MINLISTRANGE && !question.MAXLISTRANGE) {
                errorMsg = "up to " + question.MAXLISTRANGE;
              } else {
                errorMsg = "at least " + question.MINLISTRANGE;
              }

              valid = false;
              scope.errors[array_id] = "Por favor, selecciona " + errorMsg + " respuesta(s).  Seleccionaste " + checks + ".";

            } else {
              for (k in scope.errors) {
                if (scope.errors[k].match("Por favor, selecciona "))
                  delete scope.errors[k];
              }
              for (k in scope.answerForm) {
                if (k.match("Answer")) {
                  scope.answerForm[k].$setValidity("checkAnswer", true);
                }
              }
            }
          }
        }
        if(typeof scope.errors[0] == "undefined" && Object.keys(scope.errors).length > 0){
          for(k in scope.errors){
            if(scope.hasRefuse && !scope.errors[k].match("again to skip to the next question")){
              scope.errors[k] += " Click \"Next\" again to skip to the next question.";
              break;
            }
          }
        }
        $("table.qTable").floatThead('reflow');
        ngModel.$setValidity('checkAnswer', valid);
        return value;
      });

    }
  };
}]);

function buildList() {
  console.log("building master list..");
  i = 0;
  masterList[i] = new Object;
  var alter_non_list_qs = [];
  if (study.INTRODUCTION != "") {
    introduction = new Object;
    introduction.TITLE = "INTRODUCTION";
    introduction.ANSWERTYPE = "INTRODUCTION";
    introduction.PROMPT = study.INTRODUCTION;
    masterList[i][0] = introduction;
    i++;
    masterList[i] = new Object;
  }
  if (parseInt(study.HIDEEGOIDPAGE) != 1) {
    for (j in ego_id_questions) {
      if (ego_id_questions[j].ANSWERTYPE == "STORED_VALUE" || ego_id_questions[j].ANSWERTYPE == "RANDOM_NUMBER")
        continue;
      ego_id_questions[j].array_id = ego_id_questions[j].ID;
      masterList[i][parseInt(ego_id_questions[j].ORDERING) + 1] = ego_id_questions[j];
    }
  }
  if (parseInt(study.HIDEEGOIDPAGE) != 1) {
    i++;
    masterList[i] = new Object;
  }

  //if(interviewId != null){
  ego_question_list = new Object;
  prompt = "";
  for (j in questionList) {
    if ((alter_non_list_qs.length > 0 && (questionList[j].SUBJECTTYPE != "ALTER" || parseInt(questionList[j].ASKINGSTYLELIST) == 1)) || (j == questionList.length - 1 && questionList[j].SUBJECTTYPE == "ALTER" && parseInt(questionList[j].ASKINGSTYLELIST) != 1)) {
      if (j == questionList.length - 1 && questionList[j].SUBJECTTYPE == "ALTER" && parseInt(questionList[j].ASKINGSTYLELIST) != 1)
        alter_non_list_qs.push(questionList[j]);
      var preface = new Object;
      preface.ID = alter_non_list_qs[0].ID;
      preface.ANSWERTYPE = "PREFACE";
      preface.SUBJECTTYPE = "PREFACE";
      preface.TITLE = alter_non_list_qs[0].TITLE + " - PREFACE";
      preface.PROMPT = alter_non_list_qs[0].PREFACE;
      for (k in alters) {
        for (l in alter_non_list_qs) {
          var question = $.extend(true, {}, alter_non_list_qs[l]);
          question.PROMPT = question.PROMPT.replace(/\$\$/g, alters[k].NAME);
          question.TITLE = question.TITLE + " - " + alters[k].NAME;
          question.ALTERID1 = alters[k].ID;
          question.array_id = question.ID + '-' + question.ALTERID1;
          if (alter_non_list_qs[0].PREFACE != "") {
            if (alter_non_list_qs[l].ANSWERREASONEXPRESSIONID > 0)
              evalQIndex.push(i);
            masterList[i][0] = preface;
            alter_non_list_qs[0].PREFACE = "";
            i++;
            masterList[i] = new Object;
          }
          if (alter_non_list_qs[l].ANSWERREASONEXPRESSIONID > 0)
            evalQIndex.push(i);
          masterList[i][question.array_id] = question;
          i++;
          masterList[i] = new Object;
        }
      }
      alter_non_list_qs = [];
    }
    if (questionList[j - 1] != undefined && (questionList[j].SUBJECTTYPE != "EGO" || questionList[j].ASKINGSTYLELIST != 1 || questionList[j].PROMPT != questionList[j - 1].PROMPT) && questionList[j - 1].SUBJECTTYPE == "EGO" && Object.keys(ego_question_list).length > 0) {
      console.log("wait over " + Object.keys(ego_question_list).length);
      if (ego_question_list[Object.keys(ego_question_list)[0]].ANSWERREASONEXPRESSIONID > 0)
        evalQIndex.push(i);
      var stemTitle =  ego_question_list[Object.keys(ego_question_list)[0]].TITLE
      for(sl = 1; sl < Object.keys(ego_question_list).length; sl++){
        ego_question_list[Object.keys(ego_question_list)[sl]].TITLE = stemTitle;
      }
      masterList[i] = ego_question_list;
      ego_question_list = new Object;
      prompt = "";
      i++;
      masterList[i] = new Object;
    }
    if (questionList[j].SUBJECTTYPE == "NAME_GENERATOR") {
      if (questionList[j].PREFACE != "") {
        var preface = new Object;
        preface.ID = questionList[j].ID;
        preface.ANSWERTYPE = "PREFACE";
        preface.SUBJECTTYPE = "PREFACE";
        preface.TITLE = questionList[j].TITLE + " - PREFACE";
        preface.PROMPT = questionList[j].PREFACE;
        if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
          evalQIndex.push(i);
        masterList[i][0] = $.extend(true, {}, preface);
        i++;
        masterList[i] = new Object;
      }
      if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
        evalQIndex.push(i);
      questionList[j].ANSWERTYPE = "NAME_GENERATOR";
      questionList[j].array_id = questionList[j].ID;
      masterList[i][0] = questionList[j];
      i++;
      masterList[i] = new Object;
    }
    if (questionList[j].SUBJECTTYPE == "ALTER") {
      if (Object.keys(alters).length == 0)
        continue;
      alter_question_list = new Object;
      if (parseInt(questionList[j].ASKINGSTYLELIST) != 1) {
        console.log("non list alter qs")
        alter_non_list_qs.push(questionList[j]);
      } else {
        for (k in alters) {
          var question = $.extend(true, {}, questionList[j]);
          question.PROMPT = question.PROMPT.replace(/\$\$/g, alters[k].NAME);
          question.ALTERID1 = alters[k].ID;
          question.array_id = question.ID + '-' + question.ALTERID1;
          alter_question_list[question.array_id] = question;
        }
        if (Object.keys(alter_question_list).length > 0) {
          var preface = new Object;
          preface.ID = questionList[j].ID;
          preface.ANSWERTYPE = "PREFACE";
          preface.SUBJECTTYPE = "PREFACE";
          preface.TITLE = questionList[j].TITLE + " - PREFACE";
          preface.PROMPT = questionList[j].PREFACE;
          if (preface.PROMPT != "") {
            if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
              evalQIndex.push(i);
            masterList[i][0] = $.extend(true, {}, preface);
            preface.PROMPT = "";
            i++;
            masterList[i] = new Object;
          }
          if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
            evalQIndex.push(i);
          masterList[i] = alter_question_list;
          i++;
          masterList[i] = new Object;
        }
      }

    }

    if (questionList[j].SUBJECTTYPE == "ALTER_PAIR") {
      if (Object.keys(alters).length == 0)
        continue;
      var alters2 = $.extend(true, {}, alters);
      var preface = new Object;
      preface.ID = questionList[j].ID;
      preface.ANSWERTYPE = "PREFACE";
      preface.SUBJECTTYPE = "PREFACE";
      preface.TITLE = questionList[j].TITLE + " - PREFACE";
      preface.PROMPT = questionList[j].PREFACE;
      for (k in alters) {
        console.log("alter piar q...");
        if (questionList[j].SYMMETRIC) {
          var keys = Object.keys(alters2);
          delete alters2[keys[0]];
        }
        alter_pair_question_list = new Object;
        for (l in alters2) {
          if (alters[k].ID == alters2[l].ID && question.SYMMETRIC == 1)
            continue;
          var question = $.extend(true, {}, questionList[j]);
          question.PROMPT = question.PROMPT.replace(/\$\$1/g, alters[k].NAME);
          question.PROMPT = question.PROMPT.replace(/\$\$2/g, alters2[l].NAME);
          question.TITLE = question.TITLE + " - " + alters[k].NAME;
          question.ALTERID1 = alters[k].ID;
          question.ALTERID2 = alters2[l].ID;
          question.array_id = question.ID + '-' + question.ALTERID1 + 'and' + question.ALTERID2;
          if (parseInt(questionList[j].ASKINGSTYLELIST) == 1) {
            alter_pair_question_list[question.array_id] = question;
          } else {
            if (preface.PROMPT != "") {
              if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
                evalQIndex.push(i);
              masterList[i][question.array_id] = $.extend(true, {}, preface);
              preface.PROMPT = "";
              i++;
              masterList[i] = new Object;
            }
            if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
              evalQIndex.push(i);
            masterList[i][question.array_id] = question;
            i++;
            masterList[i] = new Object;
          }
        }
        if (questionList[j].ASKINGSTYLELIST == 1) {
          if (Object.keys(alter_pair_question_list).length > 0) {
            if (preface.PROMPT != "") {
              if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
                evalQIndex.push(i);
              masterList[i][0] = $.extend(true, {}, preface);
              preface.PROMPT = "";
              i++;
              masterList[i] = new Object;
            }
            if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
              evalQIndex.push(i);
            masterList[i] = alter_pair_question_list;
            i++;
            masterList[i] = new Object;
          }
        }
      }
    }

    if (questionList[j].SUBJECTTYPE == "NETWORK") {
      questionList[j].array_id = questionList[j].ID;
      if (questionList[j].PREFACE != "") {
        var preface = new Object;
        preface.ID = questionList[j].ID;
        preface.ANSWERTYPE = "PREFACE";
        preface.SUBJECTTYPE = "PREFACE";
        preface.TITLE = questionList[j].TITLE + " - PREFACE";
        preface.PROMPT = questionList[j].PREFACE;
        if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
          evalQIndex.push(i);
        masterList[i][0] = $.extend(true, {}, preface);
        i++;
        masterList[i] = new Object;
      }
      if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
        evalQIndex.push(i);
      masterList[i][questionList[j].ID] = questionList[j];
      i++;
      masterList[i] = new Object;
    }
    if (questionList[j].SUBJECTTYPE == "EGO") {
      questionList[j].array_id = questionList[j].ID;
      /*
            if (Object.keys(ego_question_list).length > 0 && (parseInt(questionList[j].ASKINGSTYLELIST) != 1 || prompt != questionList[j].PROMPT.replace(/<\/*[^>]*>/gm, '').replace(/(\r\n|\n|\r)/gm, ""))) {
              console.log(questionList[j])
              console.log("wait over " + Object.keys(ego_question_list).length);
              if (ego_question_list[Object.keys(ego_question_list)[0]].ANSWERREASONEXPRESSIONID > 0)
                evalQIndex.push(i);
              masterList[i] = ego_question_list;
              ego_question_list = new Object;
              prompt = "";
              i++;
              masterList[i] = new Object;
            }
            */
      if (questionList[j].PREFACE != "") {
        preface = new Object;
        preface.ID = questionList[j].ID;
        preface.ANSWERTYPE = "PREFACE";
        preface.SUBJECTTYPE = "PREFACE";
        preface.TITLE = questionList[j].TITLE + " - PREFACE";
        preface.PROMPT = questionList[j].PREFACE;
        if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
          evalQIndex.push(i);
        masterList[i][0] = preface;
        i++;
        masterList[i] = new Object;
      }
      if (parseInt(questionList[j].ASKINGSTYLELIST) == 1) {
        if (prompt == "" || prompt == questionList[j].PROMPT.replace(/<\/*[^>]*>/gm, '').replace(/(\r\n|\n|\r)/gm, "")) {
          console.log("adding question")
          prompt = questionList[j].PROMPT.replace(/<\/*[^>]*>/gm, '').replace(/(\r\n|\n|\r)/gm, "");
          ego_question_list[parseInt(questionList[j].ORDERING) + 1] = questionList[j];
        }
      } else {
        if (questionList[j].ANSWERREASONEXPRESSIONID > 0)
          evalQIndex.push(i);
        masterList[i][questionList[j].ID] = questionList[j];
        i++;
        masterList[i] = new Object;
      }
    }
  }
  conclusion = new Object;
  conclusion.TITLE = "CONCLUSION";
  conclusion.ANSWERTYPE = "CONCLUSION";
  conclusion.PROMPT = study.CONCLUSION;
  conclusion.array_id = 0;
  masterList[i][0] = conclusion;
  //}
}

function evalQuestions() {
  for (i in evalQIndex) {
    if (evalQIndex[i] < currentPage)
      continue;
    for (j in masterList[evalQIndex[i]]) {
      evalQList[masterList[evalQIndex[i]][j].array_id] = evalExpression(masterList[evalQIndex[i]][j].ANSWERREASONEXPRESSIONID, masterList[evalQIndex[i]][j].ALTERID1, masterList[evalQIndex[i]][j].ALTERID2);
    }
  }
}

function qFromList(pageNumber) {
  var i = 0;
  var questions = {};
  if (pageNumber == 0) {
    currentPage = i;
    return masterList[0];
  }
  for (var k in masterList) {
    questions = {};
    var proceed = false;
    if (!!~jQuery.inArray(parseInt(k), evalQIndex)) {
      for (j in masterList[k]) {
        if (evalQList[masterList[k][j].array_id] == true) {
          proceed = true;
          questions[j] = masterList[k][j];
        } else {
          if (typeof answers[masterList[k][j].array_id] == "undefined" || parseInt(answers[masterList[k][j].array_id].VALUE) != parseInt(study.VALUELOGICALSKIP)) {
            console.log("saving skip of " + masterList[k][j].TITLE, answers[masterList[k][j].array_id]);
            saveSkip(interviewId, masterList[k][j].ID, masterList[k][j].ALTERID1, masterList[k][j].ALTERID2, masterList[k][j].array_id);
          }
        }
      }
    } else {
      proceed = true;
      questions = masterList[k];
    }
    if (pageNumber == i && proceed == true) {
      //console.log(questions);
      currentPage = i;
      return questions;
    }
    if (proceed == true)
      i++;
  }
}

function evalExpression(id, alterId1, alterId2) {
  var array_id;
  if (!id || id == 0)
    return true;
  if (typeof expressions[id] == "undefined")
    return true;

  questionId = expressions[id].QUESTIONID;
  subjectType = "";
  if (questionId && questions[questionId])
    subjectType = questions[questionId].SUBJECTTYPE;

  comparers = {
    'Greater': '>',
    'GreaterOrEqual': '>=',
    'Equals': '==',
    'LessOrEqual': '<=',
    'Less': '<'
  };

  if (questionId)
    array_id = questionId;
  if (typeof alterId1 != 'undefined' && subjectType == 'ALTER')
    array_id += "-" + alterId1;
  else if (typeof alterId2 != 'undefined' && subjectType == 'ALTER_PAIR')
    array_id += "-" + alterId1 + 'and' + alterId2;

  if (typeof answers[array_id] != "undefined")
    answer = answers[array_id].VALUE;
  else
    answer = "";

  if (expressions[id].TYPE == "Text") {
    if (!answer)
      return expressions[id].RESULTFORUNANSWERED;
    if (expressions[id].OPERATOR == "Contains") {
      if (answer.indexOf(expressions[id].VALUE) != -1) {
        console.log(expressions[id].NAME + ":true");
        return true;
      }
    } else if (expressions[id].OPERATOR == "Equals") {
      if (answer == expressions[id].VALUE) {
        console.log(expressions[id].NAME + ":true");
        return true;
      }
    }
  }
  if (expressions[id].TYPE == "Number") {
    if (!answer)
      return expressions[id].RESULTFORUNANSWERED;
    logic = answer + " " + comparers[expressions[id].OPERATOR] + " " + expressions[id].VALUE;
    result = eval(logic);
    console.log(expressions[id].NAME + ":" + result);
    return result;
  }
  if (expressions[id].TYPE == "Selection") {
    if (!answer)
      return expressions[id].RESULTFORUNANSWERED;
    selectedOptions = answer.split(',');
    var options = expressions[id].VALUE.split(',');
    trues = 0;
    for (var k in selectedOptions) {
      if (expressions[id].OPERATOR == "Some" && options.indexOf(selectedOptions[k]) != -1) {
        console.log(expressions[id].NAME + ":true");
        return true;
      }
      if (expressions[id].OPERATOR == "None" && options.indexOf(selectedOptions[k]) != -1) {
        console.log(expressions[id].NAME + ":false");
        return false;
      }
      if (options.indexOf(selectedOptions[k]) != -1)
        trues++;
    }
    if (expressions[id].OPERATOR == "None" || (expressions[id].OPERATOR == "All" && trues >= options.length)) {
      console.log(expressions[id].NAME + ":true");
      return true;
    }
  }
  if (expressions[id].TYPE == "Counting") {
    countingSplit = expressions[id].VALUE.split(':');
    var times = parseInt(countingSplit[0]);
    var expressionIds = countingSplit[1];
    var questionIds = countingSplit[2];

    var count = 0;
    if (expressionIds != "") {
      expressionIds = expressionIds.split(',');
      for (var k in expressionIds) {
        count = count + evalExpression(expressionIds[k], alterId1, alterId2);
      }
    }
    if (questionIds != "") {
      questionIds = questionIds.split(',');
      for (var k in questionIds) {
        count = count + countQuestion(questionIds[k], expressions[id].OPERATOR);
      }
    }
    console.log(expressions[id].NAME + ":" + (times * count));
    return (times * count);
  }
  if (expressions[id].TYPE == "Comparison") {
    compSplit = expressions[id].VALUE.split(':');
    value = parseInt(compSplit[0]);
    var expressionId = parseInt(compSplit[1]);
    result = evalExpression(expressionId, alterId1, alterId2);
    logic = result + " " + comparers[expressions[id].OPERATOR] + " " + value;
    result = eval(logic);
    console.log(expressions[id].NAME + ":" + result);
    return result;
  }
  if (expressions[id].TYPE == "Compound") {
    var subexpressions = expressions[id].VALUE.split(',');
    var trues = 0;
    for (var k in subexpressions) {
      // prevent infinite loops!
      if (parseInt(subexpressions[k]) == id)
        continue;
      var isTrue = evalExpression(parseInt(subexpressions[k]), alterId1, alterId2);
      if (expressions[id].OPERATOR == "Some" && isTrue == true) {
        console.log(expressions[id].NAME + ":true");
        return true;
      }
      if (isTrue == true)
        trues++;
      console.log(expressions[id].NAME + ":subexpression:" + k + ":" + isTrue);
    }
    if (expressions[id].OPERATOR == "None" && trues == 0) {
      console.log(expressions[id].NAME + ":true");
      return true;
    } else if (expressions[id].OPERATOR == "All" && trues == subexpressions.length) {
      console.log(expressions[id].NAME + ":true");
      return true;
    }
  }
  if (expressions[id].TYPE == "Name Generator") {
    console.log("Name Generator Experssion");
    if (expressions[id].VALUE.match(","))
      var genList = expressions[id].VALUE.split(",");
    else
      var genList = [expressions[id].VALUE];
    aList = []
    if (alters[alterId1] != undefined) {
      if (alters[alterId1].NAMEGENQIDS.match(","))
        var aList = alters[alterId1].NAMEGENQIDS.split(",");
      else
        var aList = [alters[alterId1].NAMEGENQIDS];
    }
    for (n in aList) {
      if (genList.indexOf(aList[n]) > -1)
        return true;
    }
    console.log("name gen exp: false");
    return false;
  }
  console.log(expressions[id].NAME + ":false");
  return false;

}

function countExpression(id) {
  if (evalExpression(id) == true)
    return 1;
  else
    return 0;
}

function countQuestion(questionId, operator, alterId1, alterId2) {
  if (questionId)
    array_id = questionId;
  if (typeof alterId1 != 'undefined' && subjectType == 'ALTER')
    array_id += "-" + alterId1;
  else if (typeof alterId2 != 'undefined' && subjectType == 'ALTER_PAIR')
    array_id += 'and' + alterId2;
  if (typeof answers[array_id] != "undefined")
    answer = answers[array_id].VALUE;
  else
    answer = "";

  if (!answer) {
    return 0;
  } else {
    if (operator == "Sum")
      return parseInt(answer);
    else
      return 1;
  }
}

function interpretTags(string, alterId1, alterId2) {
  if (string == null)
    return string;
  // parse out and replace variables
  vars = string.match(/<VAR (.+?) \/>/g);
  for (k in vars) {
    var thisVar = vars[k].match(/<VAR (.+?) \/>/)[1];
    var question = getQuestion(thisVar);
    if (!question)
      continue;

    var array_id = question.ID;
    if (typeof alterId1 != 'undefined' && question.SUBJECTTYPE == 'ALTER')
      array_id += "-" + alterId1;
    else if (typeof alterId2 != 'undefined' && question.SUBJECTTYPE == 'ALTER_PAIR')
      array_id += 'and' + alterId2;

    var lastAnswer = "";
    var lastAnswerOps = [];
    if (typeof answers[array_id] != 'undefined') {
      if (question.ANSWERTYPE == "MULTIPLE_SELECTION") {
        for (o in options[question.ID]) {
          if (options[question.ID][o].ID.toString() == answers[array_id].VALUE.toString() || $.inArray(options[question.ID][o].ID.toString(), answers[array_id].VALUE.split(",")) != -1)
            lastAnswerOps.push(options[question.ID][o].NAME);
        }
        console.log("last answer ops:", answers[array_id].VALUE, question.ID, lastAnswerOps);
        lastAnswer = lastAnswerOps.join("<br>")
      } else {
        lastAnswer = answers[array_id].VALUE;
      }
      string = string.replace('<VAR ' + thisVar + ' />', lastAnswer);
    } else {
      string = string.replace('<VAR ' + thisVar + ' />', '');
    }
  }

  // performs calculations on questions
  calcs = string.match(/<CALC (.+?) \/>/g);
  for (j in calcs) {
    calc = calcs[j].match(/<CALC (.+?) \/>/)[1];
    vars = calc.match(/(\w+)/g);
    for (k in vars) {
      var thisVar = vars[k].match(/<VAR (.+?) \/>/)[1];
      if (vars[k].match(/<VAR (.+?) \/>/)) {
        var question = getQuestion(thisVar);
        if (!question)
          continue;

        var array_id = question.ID;
        if (typeof alterId1 != 'undefined' && question.SUBJECTTYPE == 'ALTER')
          array_id += "-" + alterId1;
        else if (typeof alterId2 != 'undefined' && question.SUBJECTTYPE == 'ALTER_PAIR')
          array_id += 'and' + alterId2;

        var lastAnswer = "0";
        if (typeof answers[array_id] != 'undefined') {
          if (question.ANSWERTYPE == "MULTIPLE_SELECTION") {
            for (o in options[question.ID]) {
              if ($.inArray(options[question.ID][o].ID, answers[array_id].VALUE.split(",")) != -1)
                lastAnswer = options[question.ID][o].NAME;
            }
          } else {
            lastAnswer = answers[array_id].VALUE;
          }
          logic = calc.replace(thisVar, lastAnswer);
        } else {
          logic = calc.replace(thisVar, '0');
        }
      }
    }
    try {
      calculation = eval(calc);
    } catch (err) {
      calculation = "";
    }
    string = string.replace("<CALC " + calc + " />", calculation);
  }

  // counts numbers of times question is answered with string
  var counts = string.match(/<COUNT (.+?) \/>/g);
  for (k in counts) {
    var count = counts[k].match(/<COUNT (.+?) \/>/)[1];
    var parts = count.split(' ');
    var qTitle = parts[0];
    var answer = parts[1];
    answer = answer.replace('"', '');

    var question = getQuestion(qTitle);
    if (!question)
      continue;

    var array_id = question.ID;
    if (typeof alterId1 != 'undefined' && question.SUBJECTTYPE == 'ALTER')
      array_id += "-" + alterId1;
    else if (typeof alterId2 != 'undefined' && question.SUBJECTTYPE == 'ALTER_PAIR')
      array_id += 'and' + alterId2;

    var lastAnswer = "";
    var lastAnswerOps = [];
    if (typeof answers[array_id] != 'undefined') {
        if (question.ANSWERTYPE == "MULTIPLE_SELECTION") {
          for (o in options[question.ID]) {
            if ($.inArray(options[question.ID][o].ID, answers[array_id].VALUE.split(",")) != -1)
              lastAnswerOps.push(options[question.ID][o].NAME);
          }
          lastAnswer = lastAnswerOps.join("<br>")
        } else {
          lastAnswer = answers[array_id].VALUE;
        }
      
      string = string.replace('<COUNT ' + count + ' />', lastAnswer ? 1 : 0);
    } else {
      string = string.replace('<COUNT ' + count + ' />', 0);
    }
  }

  var dates = string.match(/<DATE (.+?) \/>/g);
  var monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  for (k in dates) {
    var date = dates[k].match(/<DATE (.+?) \/>/)[1]    
    var parts =  date.split(" ");
    var qTitle = parts[0];
    var amount = parseInt(parts[1]);
    var period = parts[2];
    if (qTitle.toLowerCase() == "now") {
      var dateVal = new Date
  
    } else {
      var question = getQuestion(qTitle);
      if (!question)
        continue;
      var array_id = question.ID;
      if (typeof alterId1 != 'undefined' && question.SUBJECTTYPE == 'ALTER')
        array_id += "-" + alterId1;
      else if (typeof alterId2 != 'undefined' && question.SUBJECTTYPE == 'ALTER_PAIR')
        array_id += 'and' + alterId2;
      lastAnswer = answers[array_id].VALUE;
      var dateVal = new Date(lastAnswer);
    }
      if(period.match(/DAY/i)){
        dateVal.setDate(dateVal.getDate() + amount);
      }else if(period.match(/MONTH/i)){
        dateVal.setMonth(dateVal.getMonth() + amount);
      }else if(period.match(/YEAR/i)){
        dateVal.setYear(dateVal.getFullYear() + amount);
      }
      var newDate = monthNames[dateVal.getMonth()] + " " + dateVal.getDate() + ", " + dateVal.getFullYear()

/*
      var timeArray = [];
      var bitVals = {
        'BIT_YEAR': 1,
        'BIT_MONTH': 2,
        'BIT_WEEK': 4,
        'BIT_DAY': 8,
        'BIT_HOUR': 16,
        'BIT_MINUTE': 32,
      };
      for (var k in bitVals) {
        if (question.TIMEUNITS & bitVals[k]) {
          timeArray.push(k);
        }
      }

      
      var newDate = ""
      if (in_array("BIT_MONTH", $timeArray))
          newDate  = monthNames[dateVal.getMonth()]
      if (in_array("BIT_DAY", $timeArray))
          newDate += " " + dateval.getDate()
      if (in_array("BIT_YEAR", $timeArray))
          newDate += ", " + dateval.getFullYear();
      if (in_array("BIT_HOUR", $timeArray)){
        var ampm = "AM"
        var hours = dateval.getHours()
        if(hours > 12){
          hours = 12 - hours
          ampm = "PM"
        }
        + " " + amount + " " + period
        if(hours == 0)
          hours = 12
        var minutes = dateval.getMinutes()
        if(minutes < 10)
          minutes = "0" + minutes;
      }
      newDate += " " + hours + ":" + minutes + " " + ampm
    }
    */
    string = string.replace('<DATE ' + date + ' />', newDate)
  }

  // same as count, but limited to specific alter / alter pair questions
  containers = string.match(/<CONTAINS (.+?) \/>/g);
  for (k in containers) {
    var contains = containers[k].match(/<CONTAINS (.+?) \/>/)[1];
    var parts = contains.split(/\s/);
    var qTitle = parts[0];
    var answer = parts[1];
    answer = answer.replace(/"/g, '');
    var question = getQuestion(qTitle);
    if (!question)
      continue;
    var array_id = question.ID;
    if (typeof alterId1 != 'undefined' && question.SUBJECTTYPE == 'ALTER')
      array_id += "-" + alterId1;
    else if (typeof alterId2 != 'undefined' && question.SUBJECTTYPE == 'ALTER_PAIR')
      array_id += 'and' + alterId2;

    var lastAnswer = "";
    if (typeof answers[array_id] != 'undefined') {
      if (question.ANSWERTYPE == "MULTIPLE_SELECTION") {
        for (o in options[question.ID]) {
          if ($.inArray(options[question.ID][o].ID, answers[array_id].VALUE.split(",")) != -1)
            lastAnswer = options[question.ID][o].NAME;
        }
      } else {
        lastAnswer = answers[array_id].VALUE;
      }
      string = string.replace("<CONTAINS " + contains + " />", lastAnswer == answer ? 1 : 0);
      console.log(answer + ":" + lastAnswer);
    } else {
      string = string.replace("<CONTAINS " + contains + " />", 0);
    }
  }

  // parse out and show logics
  showlogics = string.match(/<IF (.+?) (==|!=|<|>|<=|>=)+ (.+?) \"(.+?)\" \/>/g);
  for (k in showlogics) {
    showlogic = showlogics[k];
    exp = showlogic.match(/\<IF (.+?) (==|!=|<|>|<=|>=)+ (.+?) \"(.+?)\"/);
    if (exp.length > 1) {
      for (i = 1; i < 3; i++) {
        if (i == 2 || !isNaN(parseInt(exp[i])))
          continue;
        if (exp[i].match("/>")) {
          exp[i] = interpretTags(exp[i]);
        } else {

          var qTitle = exp[i];
          var question = getQuestion(qTitle);
          if (!question)
            continue;

          var array_id = question.ID;
          if (typeof alterId1 != 'undefined' && question.SUBJECTTYPE == 'ALTER')
            array_id += "-" + alterId1;
          else if (typeof alterId2 != 'undefined' && question.SUBJECTTYPE == 'ALTER_PAIR')
            array_id += 'and' + alterId2;

          var lastAnswer = "";
          var lastAnswerOps = [];

          if (typeof answers[array_id] != 'undefined') {
            if (question.ANSWERTYPE == "MULTIPLE_SELECTION") {
              for (o in options[question.ID]) {
                if ($.inArray(options[question.ID][o].ID, answers[array_id].VALUE.split(",")) != -1)
                  lastAnswerOps.push(options[question.ID][o].NAME);
              }
              lastAnswer = lastAnswerOps.join("<br>");
            } else {
              lastAnswer = answers[array_id].VALUE;
            }
          } else {
            return false;
          }
          exp[i] = lastAnswer;
        }
      }
      logic = exp[1] + ' ' + exp[2] + ' ' + exp[3];
      console.log("logic: " + logic);
      show = eval(logic);
      if (show) {
        string = string.replace(showlogic, exp[4]);
      } else {
        string = string.replace(showlogic, "");
      }
    }
  }
  return string;
}

function getQuestion(title) {
  if (title.match(/:/)) {
    if (typeof questionTitles[title.split(":")[0]] != "undefined" && typeof questions[questionTitles[title.split(":")[0]][title.split(":")[1]]] != "undefined")
      return questions[questionTitles[title.split(":")[0]][title.split(":")[1]]];
  } else {
    if (typeof questionTitles[study.NAME] != "undefined" && typeof questions[questionTitles[study.NAME][title]] != "undefined")
      return questions[questionTitles[study.NAME][title]];
  }
  return false;
}

function initStats(question) {
  shortPaths = new Object;
  connections = [];
  nodes = [];
  edges = [];
  var n = [];
  var expressionId = question.NETWORKRELATIONSHIPEXPRID;
  var starExpressionId = parseInt(question.USELFEXPRESSION);

  if (!question.NETWORKPARAMS)
    question.NETWORKPARAMS = "[]";
  this.params = JSON.parse(question.NETWORKPARAMS);
  if (this.params == null)
    this.params = [];
  alterNames = new Object;
  betweennesses = [];
  if (alters.length == 0)
    return false;

  var alters2 = $.extend(true, {}, alters);

  if (typeof expressions[expressionId] != "undefined")
    var expression = expressions[expressionId];
  if (typeof expressions[starExpressionId] != "undefined")
    var starExpression = expressions[starExpressionId];
  console.log(expressions, starExpression)
  if (expression == undefined && starExpression == undefined)
    return

  //if(expression == undefined && expression.QUESTIONID)
  //var question = questions[expression.QUESTIONID];

  for (a in alters) {
    betweennesses[alters[a].ID] = 0;
    var keys = Object.keys(alters2);
    delete alters2[keys[0]];
    alterNames[alters[a].ID] = alters[a].NAME;
    for (b in alters2) {
      if (alters[a].ID == alters2[b].ID)
        continue;
      if (evalExpression(expressionId, alters[a].ID, alters2[b].ID) == true) {
        if ($.inArray(alters[a].ID, n) == -1)
          n.push(alters[a].ID);
        if ($.inArray(alters2[b].ID, n) == -1)
          n.push(alters2[b].ID);
        if (typeof connections[alters[a].ID] == "undefined")
          connections[alters[a].ID] = [];
        if (typeof connections[alters2[b].ID] == "undefined")
          connections[alters2[b].ID] = [];
        connections[alters[a].ID].push(alters2[b].ID);
        connections[alters2[b].ID].push(alters[a].ID);
      }
    }
  }

  this.getDistance = function (visited, node2) {
    var node1 = visited[visited.length - 1];

    if ($.inArray(node2, connections[node1]) != -1) {
      var trail = visited.slice(0);
      trail.push(node2);
      if (typeof shortPaths[visited[0] + "-" + node2] == "undefined") {

        shortPaths[visited[0] + "-" + node2] = [];
        shortPaths[visited[0] + "-" + node2].push(trail);
        if (typeof shortPaths[node2 + "-" + visited[0]] == "undefined")
          shortPaths[node2 + "-" + visited[0]] = [];
        shortPaths[node2 + "-" + visited[0]].push(trail);
      } else {
        if (trail.length < shortPaths[visited[0] + "-" + node2][0].length) {
          shortPaths[visited[0] + "-" + node2] = [];
          shortPaths[node2 + "-" + visited[0]] = [];
        }
        if (shortPaths[visited[0] + "-" + node2].length == 0 || trail.length == shortPaths[visited[0] + "-" + node2][0].length) {
          shortPaths[visited[0] + "-" + node2].push(trail);
          shortPaths[node2 + "-" + visited[0]].push(trail);
        }
      }
    } else {
      for (k in connections[node1]) {

        var endNode = connections[node1][k];

        if ($.inArray(endNode, visited) == -1) {

          var trail = visited.slice(0);
          trail.push(endNode);
          if (typeof shortPaths[visited[0] + "-" + endNode] != "undefined") {

            if (trail.length < shortPaths[visited[0] + "-" + endNode][0].length) {

              shortPaths[visited[0] + "-" + endNode] = [];
              shortPaths[endNode + "-" + visited[0]] = [];
            }
            if (shortPaths[visited[0] + "-" + endNode].length == 0 || trail.length == shortPaths[visited[0] + "-" + endNode][0].length) {

              shortPaths[visited[0] + "-" + endNode].push(trail);
              shortPaths[endNode + "-" + visited[0]].push(trail);
            } else {
              continue;
            }
          } else {
            shortPaths[visited[0] + "-" + endNode] = [];
            shortPaths[visited[0] + "-" + endNode].push(trail);
            if (typeof shortPaths[endNode + "-" + visited[0]] == "undefined")
              shortPaths[endNode + "-" + visited[0]] = [];
            shortPaths[endNode + "-" + visited[0]].push(trail);
          }
          this.getDistance(trail, node2);
        }
      }
    }
  }



  for (k in alters) {
    if (typeof connections[alters[k].ID] == "undefined") {
      //this.isolates[] = $alter.id;
      //this.nodes[] = $alter.id;
      n.push(alters[k].ID);
      connections[alters[k].ID] = [];
    }
  }

  var n2 = n.slice(0);
  for (a in n) {
    n2.shift();
    for (b in n2) {
      this.getDistance([n[a]], n2[b]);
    }
  }


  for (k in shortPaths) {
    var between = [];

    for (p in shortPaths[k]) {

      var path = shortPaths[k][p].slice(0);
      path.pop();
      path.shift();

      for (n in path) {
        if (typeof between[path[n]] == "undefined")
          between[path[n]] = 1;
        else
          between[path[n]] = between[path[n]] + 1;
      }
    }
    for (b in between) {
      betweennesses[b] = betweennesses[b] + (between[b] / shortPaths[k].length);
    }
  }


  closenesses = [];
  var alters2 = $.extend(true, {}, alters);
  for (a in alters) {
    var total = 0;
    var reachable = 0;
    for (b in alters2) {
      if (typeof shortPaths[alters[a].ID + "-" + alters2[b].ID] != "undefined") {
        distance = shortPaths[alters[a].ID + "-" + alters2[b].ID][0].length - 1;
        total = total + distance;
        reachable++;
      }
    }
    if (reachable < 1) {
      closenesses[alters[a].ID] = 0.0;
    } else {
      average = total / reachable;
      closenesses[alters[a].ID] = reachable / (average * (Object.keys(alters2).length - 1));
    }
  }

  this.nextEigenvectorGuess = function (guess) {
    var results = [];
    for (g in guess) {
      var result = 0.0;
      if (typeof connections[g] != "undefined") {
        for (c in connections[g]) {
          result = result + guess[connections[g][c]];
        }
      }
      results[g] = result;
    }
    return this.normalize(results);
  }

  this.tinyNum = 0.0000001;

  this.normalize = function (vec) {
    var magnitudeSquared = 0.0;
    for (g in vec) {
      magnitudeSquared = magnitudeSquared + Math.pow(vec[g], 2);
    }
    var magnitude = Math.sqrt(magnitudeSquared);
    var factor = 1 / (magnitude < this.tinyNum ? this.tinyNum : magnitude);
    var normalized = [];
    for (g in vec) {
      normalized[g] = vec[g] * factor;
    }
    return normalized;
  }

  this.change = function (vec1, vec2) {
    var total = 0.0;
    for (g in vec1) {
      total = total + Math.abs(vec1[g] - vec2[g]);
    }
    return total;
  }

  var tries = (n.length + 5) * (n.length + 5);
  var guess = closenesses;
  while (tries >= 0) {
    var nextGuess = this.nextEigenvectorGuess(guess);
    if (this.change(guess, nextGuess) < this.tinyNum || tries == 0) {
      eigenvectors = nextGuess;
    }
    guess = nextGuess;
    tries--;
  }

  var all = [];
  for (k in betweennesses) {
    all.push(betweennesses[k]);
  }
  maxBetweenness = Math.max.apply(Math, all);
  minBetweenness = Math.min.apply(Math, all);

  var all = [];
  for (k in eigenvectors) {
    all.push(eigenvectors[k]);
  }
  maxEigenvector = Math.max.apply(Math, all);
  minEigenvector = Math.min.apply(Math, all);

  var all = [];
  for (k in connections) {
    all.push(connections[k].length);
  }
  maxDegree = Math.max.apply(Math, all);
  minDegree = Math.min.apply(Math, all);

  this.edgeColors = {
    '#000': 'black',
    '#ccc': 'gray',
    '#07f': 'blue',
    '#0c0': 'green',
    '#f80': 'orange',
    '#fd0': 'yellow',
    '#f00': 'red',
    '#c0f': 'purple',
  };
  this.edgeSizes = {
    "0.5": '0.5',
    "2": '2',
    "4": '4',
    "8": '8',
  };
  this.nodeColors = {
    '#000': 'black',
    '#ccc': 'gray',
    '#07f': 'blue',
    '#0c0': 'green',
    '#f80': 'orange',
    '#fd0': 'yellow',
    '#f00': 'red',
    '#c0f': 'purple',
  };
  this.nodeShapes = {
    'circle': 'circle',
    'star': 'star',
    'diamond': 'diamond',
    'cross': 'cross',
    'equilateral': 'triangle',
    'square': 'square',
  };
  this.nodeSizes = {
    2: '1',
    4: '2',
    6: '3',
    8: '4',
    10: '5',
    12: '6',
    14: '7',
    16: '8',
    18: '9',
    20: '10',
  };
  this.gradient = {
    "red": {
      0: "#F5D6D6",
      1: "#ECBEBE",
      2: "#E2A6A6",
      3: "#D98E8E",
      4: "#CF7777",
      5: "#C65F5F",
      6: "#BC4747",
      7: "#B32F2F",
      8: "#A91717",
      9: "#A00000"
    },
    "blue": {
      0: "#E3E5FF",
      1: "#C9D2FF",
      2: "#B0BFFF",
      3: "#97ACFF",
      4: "#7E99FF",
      5: "#6487FF",
      6: "#4B74FF",
      7: "#3261FF",
      8: "#194EFF",
      9: "#003CFF"
    },
    "green": {
      0: "#C7FFDD",
      1: "#B2F4C7",
      2: "#9EEAB2",
      3: "#8AE09D",
      4: "#76D688",
      5: "#62CB72",
      6: "#4EC15D",
      7: "#3AB748",
      8: "#26AD33",
      9: "#12A31E"
    },
    "black": {
      0: "#EEEEEE",
      1: "#D3D3D3",
      2: "#B9B9B9",
      3: "#9E9E9E",
      4: "#848484",
      5: "#696969",
      6: "#4F4F4F",
      7: "#343434",
      8: "#1A1A1A",
      9: "#000000"
    }
  };

  this.getNodeColor = function (nodeId) {
    var defaultNodeColor = "#07f";
    console.log(this.params['nodeColor'])
    if (typeof this.params['nodeColor'] != "undefined") {
      if (typeof this.params['nodeColor']['questionId'] != "undefined" && $.inArray(this.params['nodeColor']['questionId'], ["degree", "betweenness", "eigenvector"]) != -1) {
        if (this.params['nodeColor']['questionId'] == "degree") {
          max = maxDegree;
          min = minDegree;
          value = connections[nodeId].length;
        }
        if (this.params['nodeColor']['questionId'] == "betweenness") {
          max = maxBetweenness;
          min = minBetweenness;
          value = betweennesses[nodeId];
        }
        if (this.params['nodeColor']['questionId'] == "eigenvector") {
          max = maxEigenvector;
          min = minEigenvector;
          value = eigenvectors[nodeId];
        }
        range = max - min;
        if (range == 0){
          range = max;
          min = 0;
        }
        value = Math.round(((value - min) / (range)) * 9);
        var gc_color = "red";
        for (p in this.params['nodeColor']['options']) {
          if (this.params['nodeColor']['options'][p]['id'] == this.params['nodeColor']['questionId'])
            gc_color = this.params['nodeColor']['options'][p]['color'];
        }
        return this.gradient[gc_color][value];
      } else if (typeof this.params['nodeColor']['questionId'] != "undefined" && this.params['nodeColor']['questionId'].search("expression") != -1) {
        var qId = this.params['nodeColor']['questionId'].split("_");
        if (evalExpression(qId[1], nodeId) == true) {
          for (p in this.params['nodeColor']['options']) {
            if (this.params['nodeColor']['options'][p]['id'] == 1)
              return this.params['nodeColor']['options'][p]['color'];
          }
        } else {
          for (p in this.params['nodeColor']['options']) {
            if (this.params['nodeColor']['options'][p]['id'] == 0)
              return this.params['nodeColor']['options'][p]['color'];
          }
        }
      } else {
        if (typeof this.params['nodeColor']['questionId'] != "undefined" && typeof answers[this.params['nodeColor']['questionId'] + "-" + nodeId] != "undefined")
          var answer = answers[this.params['nodeColor']['questionId'] + "-" + nodeId].VALUE.split(",");
        else
          var answer = "";
        for (p in this.params['nodeColor']['options']) {
          if (this.params['nodeColor']['options'][p]['id'] == -1 && nodeId == -1)
            return this.params['nodeColor']['options'][p]['color'];
          if (this.params['nodeColor']['options'][p]['id'] == "default" && (answer == "" || parseInt(answer) == parseInt(study.VALUELOGICALSKIP) || parseInt(answer) == parseInt(study.VALUEREFUSAL) || parseInt(answer) == parseInt(study.VALUEDONTKNOW)))
            defaultNodeColor = this.params['nodeColor']['options'][p]['color'];
          if (nodeId != -1 && (this.params['nodeColor']['options'][p]['id'] == answer || $.inArray(this.params['nodeColor']['options'][p]['id'], answer) != -1))
            return this.params['nodeColor']['options'][p]['color'];
        }
      }
    }
    return defaultNodeColor;
  }

  this, getNodeSize = function (nodeId) {
    var defaultNodeSize = 4;
    console.log(this.params)
    if (nodeId != -1 && typeof this.params['nodeSize'] != "undefined") {
      if (typeof this.params['nodeSize']['questionId'] != "undefined" && this.params['nodeSize']['questionId'] == "degree") {
        max = maxDegree;
        min = minDegree;
        value = connections[nodeId].length;
        range = max - min;
        if (range == 0){
          range = max;
          min = 0;
        }
        value = Math.round(((value - min) / (range)) * 9) + 1;
        return value * 2;
      }
      if (nodeId != -1 && typeof this.params['nodeSize']['questionId'] != "undefined" && this.params['nodeSize']['questionId'] == "betweenness") {
        max = maxBetweenness;
        min = minBetweenness;
        value = betweennesses[nodeId];
        range = max - min;
        if (range == 0){
          range = max;
          min = 0;
        }
        value = Math.round(((value - min) / (range)) * 9) + 1;
        return value * 2;
      }
      if (nodeId != -1 && typeof this.params['nodeSize']['questionId'] != "undefined" && this.params['nodeSize']['questionId'] == "eigenvector") {
        max = maxEigenvector;
        min = minEigenvector;
        value = eigenvectors[nodeId];
        range = max - min;
        if (range == 0){
          range = max;
          min = 0;
        }
        value = Math.round(((value - min) / (range)) * 9) + 1;
        return value * 2;
      }
      if (typeof this.params['nodeSize']['questionId'] != "undefined" && typeof answers[this.params['nodeSize']['questionId'] + "-" + nodeId] != "undefined")
        var answer = answers[this.params['nodeSize']['questionId'] + "-" + nodeId].VALUE.split(",");
      else
        var answer = "";
      for (p in this.params['nodeSize']['options']) {
        if (this.params['nodeSize']['options'][p]['id'] == -1 && nodeId == -1)
          defaultNodeSize = this.params['nodeSize']['options'][p]['size'];
        if (this.params['nodeSize']['options'][p]['id'] == "default" && (answer == "" || parseInt(answer) == parseInt(study.VALUELOGICALSKIP) || parseInt(answer) == parseInt(study.VALUEREFUSAL) || parseInt(answer) == parseInt(study.VALUEDONTKNOW)))
          defaultNodeSize = this.params['nodeSize']['options'][p]['size'];
        if (nodeId != -1 && (this.params['nodeSize']['options'][p]['id'] == answer || $.inArray(this.params['nodeSize']['options'][p]['id'], answer) != -1))
          defaultNodeSize = this.params['nodeSize']['options'][p]['size'];
      }
    }
    return defaultNodeSize;
  }

  this.getNodeShape = function (nodeId) {
    var defaultNodeShape = "chircle";
    if (typeof this.params['nodeShape'] != "undefined") {
      if (typeof this.params['nodeShape']['questionId'] != "undefined" && typeof answers[this.params['nodeShape']['questionId'] + "-" + nodeId] != "undefined")
        var answer = answers[this.params['nodeShape']['questionId'] + "-" + nodeId].VALUE.split(",");
      else
        var answer = "";
      for (p in this.params['nodeShape']['options']) {
        if (this.params['nodeShape']['options'][p]['id'] == 0 && (answer == "" || parseInt(answer) == parseInt(study.VALUELOGICALSKIP) || parseInt(answer) == parseInt(study.VALUEREFUSAL) || parseInt(answer) == parseInt(study.VALUEDONTKNOW)))
          defaultNodeShape = this.params['nodeShape']['options'][p]['shape'];
        if (this.params['nodeShape']['options'][p]['id'] == -1 && nodeId == -1)
          defaultNodeShape = this.params['nodeShape']['options'][p]['shape'];
        if (nodeId != -1 && (this.params['nodeShape']['options'][p]['id'] == answer || $.inArray(this.params['nodeShape']['options'][p]['id'], answer) != -1))
          return this.params['nodeShape']['options'][p]['shape'];
      }
    }
    return defaultNodeShape;
  }

  this.getEdgeColor = function (nodeId1, nodeId2) {
    var defaultEdgeColor = "#ccc";
    if (typeof this.params['edgeColor'] != "undefined") {
      if (typeof this.params['edgeColor']['questionId'] != "undefined" && typeof answers[this.params['edgeColor']['questionId'] + "-" + nodeId1 + "and" + nodeId2] != "undefined")
        var answer = answers[this.params['edgeColor']['questionId'] + "-" + nodeId1 + "and" + nodeId2].VALUE.split(",");
      else
        var answer = "";
      for (p in this.params['edgeColor']['options']) {
        if (this.params['edgeColor']['options'][p]['id'] == 0 && (answer == "" || parseInt(answer) == parseInt(study.VALUELOGICALSKIP) || parseInt(answer) == parseInt(study.VALUEREFUSAL) || parseInt(answer) == parseInt(study.VALUEDONTKNOW)))
          defaultEdgeColor = this.params['edgeColor']['options'][p]['color'];
        if (this.params['edgeColor']['options'][p]['id'] == answer || $.inArray(this.params['edgeColor']['options'][p]['id'], answer) != -1)
          return this.params['edgeColor']['options'][p]['color'];
      }
    }
    return defaultEdgeColor;
  }

  this.getEgoEdgeColor = function (nodeId1) {
    var defaultEdgeColor = "#ccc";
    if (typeof this.params['egoEdgeColor'] != "undefined") {
      if (typeof this.params['egoEdgeColor']['questionId'] != "undefined" && typeof answers[this.params['egoEdgeColor']['questionId'] + "-" + nodeId1] != "undefined")
        var answer = answers[this.params['egoEdgeColor']['questionId'] + "-" + nodeId1].VALUE.split(",");
      else
        var answer = "";
      for (p in this.params['egoEdgeColor']['options']) {
        if (this.params['egoEdgeColor']['options'][p]['id'] == "default" && (answer == "" || parseInt(answer) == parseInt(study.VALUELOGICALSKIP) || parseInt(answer) == parseInt(study.VALUEREFUSAL) || parseInt(answer) == parseInt(study.VALUEDONTKNOW)))
          defaultEdgeColor = this.params['egoEdgeColor']['options'][p]['color'];
        if (this.params['egoEdgeColor']['options'][p]['id'] == answer || $.inArray(this.params['egoEdgeColor']['options'][p]['id'], answer) != -1)
          return this.params['egoEdgeColor']['options'][p]['color'];
      }
    }
    return defaultEdgeColor;
  }

  this.getEdgeSize = function (nodeId1, nodeId2) {
    var defaultEdgeSize = 1;
    if (typeof this.params['edgeSize'] != "undefined") {
      if (typeof this.params['edgeSize']['questionId'] != "undefined" && typeof answers[this.params['edgeSize']['questionId'] + "-" + nodeId1 + "and" + nodeId2] != "undefined")
        var answer = answers[this.params['edgeSize']['questionId'] + "-" + nodeId1 + "and" + nodeId2].VALUE.split(",");
      else
        var answer = "";
      for (p in this.params['edgeSize']['options']) {
        if (this.params['edgeSize']['options'][p]['id'] == "default" && (answer == "" || parseInt(answer) == parseInt(study.VALUELOGICALSKIP) || parseInt(answer) == parseInt(study.VALUEREFUSAL) || parseInt(answer) == parseInt(study.VALUEDONTKNOW)))
          defaultEdgeSize = this.params['edgeSize']['options'][p]['size'];
        if (this.params['edgeSize']['options'][p]['id'] == answer || $.inArray(this.params['edgeSize']['options'][p]['id'], answer) != -1)
          return this.params['edgeSize']['options'][p]['size'];
      }
    }
    return defaultEdgeSize;
  }

  this.getEgoEdgeSize = function (nodeId1, nodeId2) {
    var defaultEdgeSize = 1;
    if (typeof this.params['egoEdgeSize'] != "undefined") {
      if (typeof this.params['egoEdgeSize']['questionId'] != "undefined" && typeof answers[this.params['egoEdgeSize']['questionId'] + "-" + nodeId1] != "undefined")
        var answer = answers[this.params['egoEdgeSize']['questionId'] + "-" + nodeId1].VALUE.split(",");
      else
        var answer = "";
      for (p in this.params['egoEdgeSize']['options']) {
        if (this.params['egoEdgeSize']['options'][p]['id'] == 0 && (answer == "" || parseInt(answer) == parseInt(study.VALUELOGICALSKIP) || parseInt(answer) == parseInt(study.VALUEREFUSAL) || parseInt(answer) == parseInt(study.VALUEDONTKNOW)))
          defaultEdgeSize = this.params['egoEdgeSize']['options'][p]['size'];
        if (this.params['egoEdgeSize']['options'][p]['id'] == answer || $.inArray(this.params['egoEdgeSize']['options'][p]['id'], answer) != -1)
          return this.params['egoEdgeSize']['options'][p]['size'];
      }
    }
    return defaultEdgeSize;
  }

  var alters2 = $.extend(true, {}, alters);
  if (starExpression != undefined) {
    nodes.push({
      'id': '-1',
      'label': this.params['egoLabel'],
      'x': Math.random(),
      'y': Math.random(),
      "type": this.getNodeShape(-1),
      "color": this.getNodeColor(-1),
      "size": this.getNodeSize(-1),
    })
  }
  for (a in alters) {
    nodes.push({
      'id': alters[a].ID.toString(),
      'label': alters[a].NAME + (typeof notes[alters[a].ID] != "undefined" ? " �" : ""),
      'x': Math.random(),
      'y': Math.random(),
      "type": this.getNodeShape(alters[a].ID),
      "color": this.getNodeColor(alters[a].ID),
      "size": this.getNodeSize(alters[a].ID),
    });
    if (starExpression != undefined) {
      if (evalExpression(starExpressionId, alters[a].ID, alters2[b].ID) == true) {
        edges.push({
          "id": "-1_" + alters[a].ID,
          "source": alters[a].ID.toString(),
          "target": '-1',
          "color": this.getEgoEdgeColor(alters[a].ID),
          "size": this.getEgoEdgeSize(alters[a].ID),
        });
      }
    }
    var keys = Object.keys(alters2);
    delete alters2[keys[0]];
    if (expression != undefined) {
      for (b in alters2) {
        if (evalExpression(expressionId, alters[a].ID, alters2[b].ID) == true) {
          edges.push({
            "id": alters[a].ID + "_" + alters2[b].ID,
            "source": alters2[b].ID.toString(),
            "target": alters[a].ID.toString(),
            "color": this.getEdgeColor(alters[a].ID, alters2[b].ID),
            "size": this.getEdgeSize(alters[a].ID, alters2[b].ID),
          });
        }
      }
    }
  }


  g = {
    nodes: nodes,
    edges: edges,
    //legends:  <?= json_encode($legends); ?>
  };

  sizes = [];
  for (y in g.nodes) {
    sizes.push(g.nodes[y].size)
  }
  max_node_size = Math.max.apply(Math, sizes);

  sizes = [];
  for (y in g.edges) {
    sizes.push(g.edges[y].size)
  }
  max_edge_size = Math.max.apply(Math, sizes);

  setTimeout(function () {
    sigma.renderers.def = sigma.renderers.canvas;
    s = new sigma({
      graph: g,
      renderer: {
        container: document.getElementById('infovis'),
        type: 'canvas'
      },
      settings: {
        doubleClickEnabled: false,
        labelThreshold: 1,
        minNodeSize: 2,
        maxNodeSize: max_node_size,
        minEdgeSize: 0.5,
        maxEdgeSize: max_edge_size,
        zoomingRatio: 1.0,
        sideMargin: 2
      }
    });
    if (typeof graphs[expressionId] != "undefined") {
      savedNodes = JSON.parse(graphs[expressionId].NODES);
      for (var k in savedNodes) {
        var node = s.graph.nodes(k.toString());
        if (node) {
          node.x = savedNodes[k].x;
          node.y = savedNodes[k].y;
        }
      }
    } else {
      s.startForceAtlas2({
        "worker": false,
        "outboundAttractionDistribution": true,
        "speed": 2000,
        "gravity": 0.2,
        "jitterTolerance": 0,
        "strongGravityMode": true,
        "barnesHutOptimize": false,
        "totalSwinging": 0,
        "totalEffectiveTraction": 0,
        "complexIntervals": 500,
        "simpleIntervals": 1000
      });
      setTimeout("s.stopForceAtlas2(); saveNodes(); $('#fullscreenButton').prop('disabled', false);", 5000);
    }
    s.refresh();
    initNotes(s);
  }, 1);
}

function fullscreen() {
  elem = document.getElementById("infovis");
  if (typeof elem.requestFullscreen != "undefined") {
    elem.requestFullscreen();
  } else if (typeof elem.msRequestFullscreen != "undefined") {
    elem.msRequestFullscreen();
  } else if (typeof elem.mozRequestFullScreen != "undefined") {
    elem.mozRequestFullScreen();
  } else if (typeof elem.webkitRequestFullscreen != "undefined") {
    elem.webkitRequestFullscreen();
  }
  graphWidth = $("#infovis").width()
  $("#infovis").height(screen.height);
  $("#infovis").width(screen.width);

  setTimeout(function () {
    document.addEventListener('webkitfullscreenchange', exitHandler, false);
    document.addEventListener('mozfullscreenchange', exitHandler, false);
    document.addEventListener('fullscreenchange', exitHandler, false);
    document.addEventListener('MSFullscreenChange', exitHandler, false);

  }, 500);

}

function toggleLabels() {
  var labelT = s.renderers[0].settings("labelThreshold");
  if (labelT == 1)
    s.renderers[0].settings({
      labelThreshold: 100
    });
  else
    s.renderers[0].settings({
      labelThreshold: 1
    });
  s.refresh();
}

function exitHandler() {
  if (document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement !== null) {
    $("#infovis").height(360);
    $("#infovis").width(graphWidth)
    $("#infovis canvas").height(360);
    $("#infovis canvas").width(graphWidth);
    $("#infovis canvas").attr("height", 360);
    $("#infovis canvas").attr("width", graphWidth);
    //window.dispatchEvent(new Event('resize'));
    setTimeout(function () {
      window.dispatchEvent(new Event('resize'));

      //s.cameras[0].goTo({ x: 0, y: 0, angle: 0, ratio: 1 });
      //s.refresh();
    }, 100);
    document.removeEventListener('webkitfullscreenchange', exitHandler, false);
    document.removeEventListener('mozfullscreenchange', exitHandler, false);
    document.removeEventListener('fullscreenchange', exitHandler, false);
    document.removeEventListener('MSFullscreenChange', exitHandler, false);
  }
}

function navFromList(pageNumber, scope) {
  var i = 0;
  var pages = [];
  this.checkPage = function (iPage, pageNumber, text) {
    if (iPage == pageNumber) {
      $("#questionTitle").html(text);
      text = "<b>" + text + "</b>";
    }
    if (iPage - 1 == pageNumber && text == "CONCLUSION")
      scope.conclusion = true;
    return text;
  };
  for (k in masterList) {
    var proceed = false;
    if (jQuery.inArray(parseInt(k), evalQIndex) != -1) {
      for (j in masterList[k]) {
        if (evalQList[masterList[k][j].array_id] == true) {
          proceed = true;
          pages[i] = this.checkPage(i, pageNumber, masterList[k][j].TITLE);
          continue;
        }
      }
    } else {
      for (j in masterList[k]) {
        proceed = true;
        pages[i] = this.checkPage(i, pageNumber, masterList[k][j].TITLE);
        continue;
      }
    }
    if (proceed == true)
      i++;
  }
  scope.nav = pages;
}

function columnWidths() {
  return;
  var tWidth;
  var cWidths = [];
  tWidth = $("#realHeader").width();
  $("#realHeader").children().each(function (index) {
    cWidths[index] = $(this).width();
  });
  $("#floatHeader").width(tWidth);
  $("#floatHeader").css({
    "background-color": $("#content").css("background-color")
  });
  $("#realHeader").parent().css({
    "margin-top": "-" + $("#floater").height() + "px"
  });
  $("#floater").children().each(function (index) {
    $(this).width(cWidths[index]);
  });
}

function fixHeader() {
  console.log("fixing header");
  columnWidths();
  // Set this variable with the height of your sidebar + header
  var offsetLeft = $("#realHeader").offset().left
  var offsetPixels = $(".navbar").height();
  $("#content").css({
    "background-attachment": "fixed"
  });
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    /*
    $(window).scroll(function(event) {
      $("#floatHeader").css({
        "position": "fixed",
        "z-index": "111",
        "top": offsetPixels + "px",
        "left": offsetLeft - $(window).scrollLeft() + "px",
        "padding-top": parseInt($("#content").css("padding-top")) + "px"
      });
      $("#answerForm").css({
        "margin-top": $("#floatHeader").height() + "px"
      });
    });
    $(window).scroll();
    */
  } else {
    /*
    $(window).on('touchmove', function(event) {
      $("#floatHeader").css({
        "position": "fixed",
        "top": offsetPixels + "px",
        "left": offsetLeft - $(window).scrollLeft() + "px",
        "padding-top": parseInt($("#content").css("padding-top")) + "px"
      });
      $("#answerForm").css({
        "margin-top": $("#floatHeader").height() + "px"
      });
    });
    */
  }
  var resizeTimer;

  $(window).on('resize', function (e) {

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      /*
          $(window).unbind('scroll');
          $("#content").css({
            "background-attachment": "fixed"
          });
          $("#floatHeader").css({
            "position": "fixed",
            "left": $("#realHeader").offset().left - $(window).scrollLeft() + "px",
          });
          fixHeader();
      */
      // $("#qTable").floatThead({top:$("#topbar").height()})
    }, 250);

  });
  /*
    $(window).resize(function() {
      $(window).unbind('scroll');
      var offsetLeft = $("#realHeader").offset().left
      $("#content").css({
        "background-attachment": "fixed"
      });
      $("#floatHeader").css({
        "position": "fixed",
        "left": offsetLeft - $(window).scrollLeft() + "px",
      });
      fixHeader();
    });*/
}

function unfixHeader() {
  $("#content").css({
    "background-attachment": "initial"
  });
  $("#floatHeader").css({
    "padding-top": "0",
    "top": "0",
    "position": "static"
  });
  $("#answerForm").css({
    "margin-top": "0"
  });
  $(window).unbind('scroll');
  $(window).unbind('touchmove');
  $(window).unbind('resize');
}

function htmldecode(str) {
  var txt = document.createElement('textarea');
  txt.innerHTML = str.trim();
  return $(txt).val();
}