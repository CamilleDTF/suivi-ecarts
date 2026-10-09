-- Une réclamation peut être la source d'un REX, comme un écart, un évènement
-- SSE, un écart amiante ou une remontée.
ALTER TYPE "OrigineREX" ADD VALUE IF NOT EXISTS 'RECLAMATION' BEFORE 'SPONTANE';

-- CreateTable
CREATE TABLE "_ReclamationToRex" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReclamationToRex_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ReclamationToRex_B_index" ON "_ReclamationToRex"("B");

-- AddForeignKey
ALTER TABLE "_ReclamationToRex" ADD CONSTRAINT "_ReclamationToRex_A_fkey" FOREIGN KEY ("A") REFERENCES "Reclamation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReclamationToRex" ADD CONSTRAINT "_ReclamationToRex_B_fkey" FOREIGN KEY ("B") REFERENCES "Rex"("id") ON DELETE CASCADE ON UPDATE CASCADE;
