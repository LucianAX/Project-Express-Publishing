const express = require('express');
const sqlite3 = require('sqlite3');
const { ids } = require('webpack');
const issuesRouter = express.Router({ mergeParams: true });

// check if process.env.TEST_DATABASE has been set, and if so load that database instead.
// This allows the CCmy testing suite to check the routes without corrupting the app's database.
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

issuesRouter.param('issueId', (req, res, next, issueId) => {
    db.get(`
        SELECT *
        FROM Issue
        WHERE id = $id;
        `, { $id: issueId },
        (err, issue) => {
            if (err) {
                next(err);
            }
            if (!issue) {
                res.sendStatus(404);
            } else {
                req.issue = issue;
                next();
            }
    });
});

issuesRouter.get('/', (req, res, next) => {
    db.all(`
        SELECT *
        FROM Issue
        WHERE series_id = $seriesId;
        `, { $seriesId: req.params.seriesId },
        (err, issues) => {
            if (err) {
                next(err);
            }
            res.status(200).send({ issues: issues });
    });
});

issuesRouter.post('/', (req, res, next) => {
    const name = req.body.issue.name;
    const issueNumber = req.body.issue.issueNumber;
    const publicationDate = req.body.issue.publicationDate;
    const artistId = req.body.issue.artistId;
    const seriesId = req.params.seriesId;

    // serialized variant
    // db.get(`
    //     SELECT *
    //     FROM Artist
    //     WHERE id = $artistId;
    //     `, { $artistId: artistId },
    //     (err, artist) => {
    //       if (err) {
    //           next(err);
    //       } else if (!name || !issueNumber || 
    //                  !publicationDate || !artist) {
    //             return res.sendStatus(400);
    //       }

    //       db.serialize(() => {
    //           let newIssueId = -1;
    //           db.run(`
    //               INSERT INTO Issue (
    //                   name, issue_number, publication_date, artist_id, series_id
    //               )  
    //               VALUES (
    //                   $name, $issueNumber, $publicationDate, $artistId, $seriesId
    //               );
    //               `, {
    //                   $name: name,
    //                   $issueNumber: issueNumber,
    //                   $publicationDate: publicationDate,
    //                   $artistId: artistId,
    //                   $seriesId: seriesId
    //               }, function(err) {
    //                     if (err) {
    //                       next(err);
    //                     } 
    //                     newIssueId = this.lastId;
    //               }
    //           );

    //           db.get(`
    //               SELECT *
    //               FROM Issue
    //               WHERE id = $newIssueId;
    //               `, { $newIssueId: newIssueId },
    //               (err, newIssue) => {
    //                 if (err) {
    //                   next(err);
    //                 }
    //                 res.status(201).send({ issue: newIssue });
    //               }
    //           );
    //       });
    //     }
    // );

    
    // nested variant for CC test suite
    db.get(`
        SELECT *
        FROM Artist
        WHERE id = $artistId;
        `, { $artistId: artistId },
        (err, artist) => {
          if (err) {
              next(err);
          } else if (!name || !issueNumber || 
                     !publicationDate || !artist) {
                return res.sendStatus(400);
          }

          db.run(`
              INSERT INTO Issue (
                  name, issue_number, publication_date, artist_id, series_id
              )  
              VALUES (
                  $name, $issueNumber, $publicationDate, $artistId, $seriesId
              );
              `, {
                  $name: name,
                  $issueNumber: issueNumber,
                  $publicationDate: publicationDate,
                  $artistId: artistId,
                  $seriesId: seriesId
              }, function(err) {
                    if (err) {
                      next(err);
                    } 
                    db.get(`
                        SELECT *
                        FROM Issue
                        WHERE id = ${this.lastID};
                        `,
                        (err, newIssue) => {
                          if (err) {
                            next(err);
                          }
                          res.status(201).send({ issue: newIssue });
                        }
                    );
              }
          );                
        }
    );


});

issuesRouter.put('/:issueId', (req, res, next) => {
    const issueId = req.params.issueId;
    const name = req.body.issue.name;
    const issueNumber = req.body.issue.issueNumber;
    const publicationDate = req.body.issue.publicationDate;
    const artistId = req.body.issue.artistId;
    const seriesId = req.params.seriesId;

    let artistExists = false;

    db.get(`
        SELECT *
        FROM Artist
        WHERE id = $artistId;
        `, { $artistId: artistId },
        (err, artist) => {
            if (err) {
                next(err);
            } else if (!name || !issueNumber ||
                       !publicationDate || !artist) {
                return res.sendStatus(400);
            }
            
            db.serialize(() => {
                db.run(`
                    UPDATE Issue
                    SET name = $name,
                        issue_number = $issueNumber,
                        publication_date = $publicationDate,
                        artist_id = $artistId,
                        series_id = $seriesId
                    WHERE id = $issueId;
                    `, {
                        $issueId: issueId,
                        $name: name,
                        $issueNumber: issueNumber,
                        $publicationDate: publicationDate,
                        $artistId: artistId,
                        $seriesId: seriesId
                    }, (err) => {
                        if (err) {
                            next(err);
                        }
                    }
                );

                db.get(`
                    SELECT *
                    FROM Issue
                    WHERE id = $issueId;
                    `, { $issueId: issueId },
                    (err, updatedIssue) => {
                        if (err) {
                            next(err);
                        }
                        res.status(200).send({ issue: updatedIssue });
                    }
                );
            });
        }
    );
});

issuesRouter.delete('/:issueId', (req, res, next) => {
    db.run(`
        DELETE FROM Issue
        WHERE id = $id;
        `, { $id: req.params.issueId },
        (err) => {
            if (err) {
                next(err);
            }
            res.sendStatus(204);
        });
});

module.exports = issuesRouter;