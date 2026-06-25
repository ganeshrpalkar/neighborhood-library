(function () {
  'use strict';

  function initQuizzes() {
    var questions = document.querySelectorAll('.quiz-question');
    var total = questions.length;
    var score = 0;
    var answered = 0;
    var scoreEl = document.querySelector('.quiz-score');

    function updateScore() {
      if (!scoreEl) return;
      if (answered === 0) {
        scoreEl.textContent = total + ' question' + (total === 1 ? '' : 's') + ' — click an answer to begin';
      } else if (answered === total) {
        scoreEl.textContent = 'Final score: ' + score + '/' + total + (score === total ? ' — perfect!' : ' — review the ones you missed');
      } else {
        scoreEl.textContent = score + '/' + answered + ' correct · ' + (total - answered) + ' remaining';
      }
    }

    questions.forEach(function (q) {
      var options = q.querySelectorAll('.quiz-option');
      var correctVal = q.dataset.correct;
      var explanation = q.querySelector('.quiz-explanation');
      var done = false;

      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (done) return;
          done = true;
          answered += 1;

          var isCorrect = (opt.dataset.value === correctVal);
          if (isCorrect) score += 1;

          options.forEach(function (o) {
            o.disabled = true;
            if (o.dataset.value === correctVal) {
              o.classList.add('correct');
            } else if (o === opt && !isCorrect) {
              o.classList.add('wrong');
            }
          });

          if (explanation) explanation.style.display = 'block';
          updateScore();
        });
      });
    });

    updateScore();
  }

  function initFlashcards() {
    document.querySelectorAll('.flashcard-front').forEach(function (front) {
      front.addEventListener('click', function () {
        var card = front.closest('.flashcard');
        card.classList.toggle('open');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initQuizzes();
    initFlashcards();
  });
}());
