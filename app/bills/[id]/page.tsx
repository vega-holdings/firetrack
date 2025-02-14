import { getBillById } from "@/lib/actions/bill-actions";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";

export default async function BillPage({ params }: { params: { id: string } }) {
  // Add 'ocd-bill/' prefix back for database lookup
  const result = await getBillById(`ocd-bill/${params.id}`);

  if (!result.success || !result.data) {
    notFound();
  }

  const { bill } = result.data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{bill.identifier}</CardTitle>
                <p className="text-muted-foreground mt-2">
                  {bill.jurisdiction_name}
                </p>
              </div>
              {bill.latest_action_date && (
                <span className="text-sm text-muted-foreground">
                  Last Updated: {formatDate(bill.latest_action_date)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="font-semibold mb-2">Title</h3>
              <p>{bill.title}</p>
            </div>

            {/* Session Info */}
            <div>
              <h3 className="font-semibold mb-2">Session Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Session</p>
                  <p>{bill.session}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Classification</p>
                  <div className="flex flex-wrap gap-1">
                    {bill.classification?.map((cls) => (
                      <span
                        key={cls}
                        className="inline-flex items-center rounded-full bg-secondary/50 px-2 py-0.5 text-xs"
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Subjects */}
            {bill.subject && bill.subject.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Subjects</h3>
                <div className="flex flex-wrap gap-2">
                  {bill.subject.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Organization Info */}
            <div>
              <h3 className="font-semibold mb-2">Organization</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p>{bill.from_organization_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Classification</p>
                  <p>{bill.from_organization_classification}</p>
                </div>
              </div>
            </div>

            {/* Latest Action */}
            {bill.latest_action_description && (
              <div>
                <h3 className="font-semibold mb-2">Latest Action</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  {bill.latest_action_date && (
                    <p className="text-sm text-muted-foreground mb-1">
                      {formatDate(bill.latest_action_date)}
                    </p>
                  )}
                  <p>{bill.latest_action_description}</p>
                </div>
              </div>
            )}

            {/* Action History */}
            {bill.actions && bill.actions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">History</h3>
                <div className="space-y-4">
                  {bill.actions.map((action) => (
                    <div key={action.id} className="border-l-2 pl-4">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(action.date)}
                      </p>
                      <p>{action.description}</p>
                      {action.classification && action.classification.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {action.classification.map((cls) => (
                            <span
                              key={cls}
                              className="inline-flex items-center rounded-full bg-secondary/50 px-2 py-0.5 text-xs"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sponsors */}
            {bill.sponsors && bill.sponsors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Sponsors</h3>
                <div className="grid gap-2">
                  {bill.sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="flex items-center gap-2">
                      <span className="text-sm">{sponsor.name}</span>
                      {sponsor.primary && (
                        <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {bill.documents && bill.documents.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bill.documents.map((doc) => (
                    <div key={doc.id} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex flex-col gap-2">
                        <p className="font-medium">{doc.note || "Document"}</p>
                        {doc.links && doc.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            {link.media_type || 'View Document'}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Versions */}
            {bill.versions && bill.versions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Versions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bill.versions.map((ver) => (
                    <div key={ver.id} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex flex-col gap-2">
                        <p className="font-medium">{ver.note || "Version"}</p>
                        {ver.links && ver.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            {link.media_type || 'View Version'}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Votes */}
            {bill.votes && bill.votes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Votes</h3>
                <div className="space-y-4">
                  {bill.votes.map((vote) => (
                    <div key={vote.id} className="bg-muted/50 rounded-lg p-4">
                      <div className="space-y-2">
                        <p className="font-medium">{vote.motion_text || "Vote"}</p>
                        <div className="grid grid-cols-3 gap-4">
                          {vote.counts.map((count) => (
                            <div key={count.option} className="text-center">
                              <p className="text-sm text-muted-foreground">{count.option}</p>
                              <p className="font-medium">{count.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {bill.comments && bill.comments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Comments</h3>
                <div className="space-y-4">
                  {bill.comments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-4">
                      <p>{comment.text}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Annotations */}
            {bill.annotations && bill.annotations.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Annotations</h3>
                <div className="space-y-4">
                  {bill.annotations.map((annotation) => (
                    <div key={annotation.id} className="bg-muted/50 rounded-lg p-4">
                      <p>{annotation.text}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {formatDate(annotation.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
