-- Une action peut naître d'une remontée d'information traitée directement,
-- sans passer par la création d'un écart : quatrième rattachement possible,
-- toujours exclusif des trois autres.
ALTER TABLE "Action" ADD COLUMN "remonteeId" TEXT;
ALTER TABLE "Action" ADD CONSTRAINT "Action_remonteeId_fkey"
  FOREIGN KEY ("remonteeId") REFERENCES "RemonteeInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
